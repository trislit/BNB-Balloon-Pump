import { expect } from "chai";
import { ethers } from "hardhat";
import { BalloonPump } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("BalloonPump", function () {
  let balloonPump: BalloonPump;
  let owner: SignerWithAddress;
  let relayer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let feeWallet: SignerWithAddress;
  let mockToken: any;

  const INITIAL_BALANCE = ethers.utils.parseEther("10000");
  const DEPOSIT_AMOUNT = ethers.utils.parseEther("1000");
  const PUMP_AMOUNT = ethers.utils.parseEther("100");

  beforeEach(async function () {
    // Get signers
    [owner, relayer, user1, user2, user3, feeWallet] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock Token", "MOCK", INITIAL_BALANCE.mul(10));
    await mockToken.deployed();

    // Deploy BalloonPump
    const BalloonPump = await ethers.getContractFactory("BalloonPump");
    balloonPump = await BalloonPump.deploy();
    await balloonPump.deployed();

    // Setup contract configuration
    await balloonPump.setConfig(
      100, // 1% fee
      ethers.utils.parseEther("1000"), // max per pump
      ethers.utils.parseEther("10000"), // max per round per user
      feeWallet.address,
      ethers.constants.AddressZero, // burn to zero address
      relayer.address
    );

    // Mint tokens to users and approve contract
    for (const user of [user1, user2, user3]) {
      await mockToken.mint(user.address, INITIAL_BALANCE);
      await mockToken.connect(user).approve(balloonPump.address, INITIAL_BALANCE);
    }

    // Open first round
    await balloonPump.openRound(ethers.utils.parseEther("10000")); // 10000 threshold
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await balloonPump.owner()).to.equal(owner.address);
    });

    it("Should initialize with default config", async function () {
      const config = await balloonPump.config();
      expect(config.feeBps).to.equal(100);
      expect(config.maxPerPump).to.equal(ethers.utils.parseEther("1000"));
    });
  });

  describe("Configuration", function () {
    it("Should allow owner to update config", async function () {
      await balloonPump.setConfig(
        200, // 2% fee
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("20000"),
        feeWallet.address,
        ethers.constants.AddressZero,
        relayer.address
      );

      const config = await balloonPump.config();
      expect(config.feeBps).to.equal(200);
      expect(config.maxPerPump).to.equal(ethers.utils.parseEther("2000"));
    });

    it("Should reject config updates from non-owner", async function () {
      await expect(
        balloonPump.connect(user1).setConfig(
          200, 1000, 10000, feeWallet.address, ethers.constants.AddressZero, relayer.address
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Deposits", function () {
    it("Should allow users to deposit tokens", async function () {
      await balloonPump.connect(user1).deposit(mockToken.address, DEPOSIT_AMOUNT);

      const vaultBalance = await balloonPump.vaults(user1.address, mockToken.address);
      expect(vaultBalance).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should emit Deposited event", async function () {
      await expect(
        balloonPump.connect(user1).deposit(mockToken.address, DEPOSIT_AMOUNT)
      )
        .to.emit(balloonPump, "Deposited")
        .withArgs(user1.address, mockToken.address, DEPOSIT_AMOUNT, 1);
    });

    it("Should reject deposits of zero amount", async function () {
      await expect(
        balloonPump.connect(user1).deposit(mockToken.address, 0)
      ).to.be.revertedWith("Amount must be positive");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await balloonPump.connect(user1).deposit(mockToken.address, DEPOSIT_AMOUNT);
    });

    it("Should allow users to withdraw tokens", async function () {
      const withdrawAmount = ethers.utils.parseEther("500");

      await balloonPump.connect(user1).withdraw(mockToken.address, withdrawAmount);

      const vaultBalance = await balloonPump.vaults(user1.address, mockToken.address);
      expect(vaultBalance).to.equal(DEPOSIT_AMOUNT.sub(withdrawAmount));
    });

    it("Should reject withdrawals exceeding vault balance", async function () {
      const excessiveAmount = DEPOSIT_AMOUNT.add(1);

      await expect(
        balloonPump.connect(user1).withdraw(mockToken.address, excessiveAmount)
      ).to.be.revertedWith("Insufficient vault balance");
    });
  });

  describe("Pumping", function () {
    beforeEach(async function () {
      await balloonPump.connect(user1).deposit(mockToken.address, DEPOSIT_AMOUNT);
      await balloonPump.connect(user2).deposit(mockToken.address, DEPOSIT_AMOUNT);
    });

    it("Should allow relayer to pump balloon", async function () {
      await balloonPump.connect(relayer).pump(user1.address, mockToken.address, PUMP_AMOUNT);

      const round = await balloonPump.rounds(1);
      expect(round.pressure).to.equal(PUMP_AMOUNT);
      expect(round.pot).to.equal(PUMP_AMOUNT.sub(PUMP_AMOUNT.div(100))); // Subtract 1% fee
    });

    it("Should update last three pumpers correctly", async function () {
      await balloonPump.connect(relayer).pump(user1.address, mockToken.address, PUMP_AMOUNT);
      await balloonPump.connect(relayer).pump(user2.address, mockToken.address, PUMP_AMOUNT);
      await balloonPump.connect(relayer).pump(user3.address, mockToken.address, PUMP_AMOUNT);

      const round = await balloonPump.rounds(1);
      expect(round.lastThree[0]).to.equal(user3.address);
      expect(round.lastThree[1]).to.equal(user2.address);
      expect(round.lastThree[2]).to.equal(user1.address);
    });

    it("Should reject pump from non-relayer", async function () {
      await expect(
        balloonPump.connect(user1).pump(user1.address, mockToken.address, PUMP_AMOUNT)
      ).to.be.revertedWith("Only relayer can call");
    });

    it("Should reject pump exceeding max per pump", async function () {
      const excessiveAmount = ethers.utils.parseEther("2000");

      await expect(
        balloonPump.connect(relayer).pump(user1.address, mockToken.address, excessiveAmount)
      ).to.be.revertedWith("Exceeds max per pump");
    });

    it("Should reject pump when round is not open", async function () {
      // Close the round by reaching threshold
      for (let i = 0; i < 100; i++) {
        await balloonPump.connect(relayer).pump(user1.address, mockToken.address, PUMP_AMOUNT);
      }

      await expect(
        balloonPump.connect(relayer).pump(user2.address, mockToken.address, PUMP_AMOUNT)
      ).to.be.revertedWith("No active round");
    });
  });

  describe("Balloon Popping", function () {
    beforeEach(async function () {
      await balloonPump.connect(user1).deposit(mockToken.address, DEPOSIT_AMOUNT.mul(10));
    });

    it("Should pop balloon when pressure reaches threshold", async function () {
      const threshold = ethers.utils.parseEther("10000");
      const pumpCount = 100; // 100 * 100 = 10000 pressure

      for (let i = 0; i < pumpCount; i++) {
        await balloonPump.connect(relayer).pump(user1.address, mockToken.address, PUMP_AMOUNT);
      }

      const round = await balloonPump.rounds(1);
      expect(round.open).to.be.false;
      expect(round.poppedAt).to.be.gt(0);
    });

    it("Should emit Popped event when balloon pops", async function () {
      const threshold = ethers.utils.parseEther("10000");

      await expect(
        balloonPump.connect(relayer).pump(user1.address, mockToken.address, threshold)
      )
        .to.emit(balloonPump, "Popped")
        .withArgs(1, await balloonPump.rounds(1).then(r => r.pot), user1.address, ethers.constants.AddressZero, ethers.constants.AddressZero);
    });
  });

  describe("Reward Distribution", function () {
    beforeEach(async function () {
      // Setup multiple users with deposits
      for (const user of [user1, user2, user3]) {
        await balloonPump.connect(user).deposit(mockToken.address, DEPOSIT_AMOUNT);
      }
    });

    it("Should distribute rewards correctly after settling", async function () {
      // Pump to pop balloon
      await balloonPump.connect(relayer).pump(user1.address, mockToken.address, ethers.utils.parseEther("10000"));

      // Settle payouts
      await balloonPump.settlePayouts(mockToken.address);

      const round = await balloonPump.rounds(1);
      expect(round.settled).to.be.true;

      // Check winner received 50% of pot
      const winnerBalance = await balloonPump.vaults(user1.address, mockToken.address);
      expect(winnerBalance).to.be.gt(DEPOSIT_AMOUNT); // Should have received reward
    });

    it("Should reject multiple settlements", async function () {
      // Pump to pop balloon
      await balloonPump.connect(relayer).pump(user1.address, mockToken.address, ethers.utils.parseEther("10000"));

      // First settlement
      await balloonPump.settlePayouts(mockToken.address);

      // Second settlement should fail
      await expect(
        balloonPump.settlePayouts(mockToken.address)
      ).to.be.revertedWith("Already settled");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      await balloonPump.pause();
      expect(await balloonPump.paused()).to.be.true;

      await balloonPump.unpause();
      expect(await balloonPump.paused()).to.be.false;
    });

    it("Should prevent operations when paused", async function () {
      await balloonPump.connect(user1).deposit(mockToken.address, DEPOSIT_AMOUNT);
      await balloonPump.pause();

      await expect(
        balloonPump.connect(user1).withdraw(mockToken.address, PUMP_AMOUNT)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner emergency withdrawal", async function () {
      // Send some tokens to contract
      await mockToken.transfer(balloonPump.address, ethers.utils.parseEther("100"));

      const initialOwnerBalance = await mockToken.balanceOf(owner.address);

      await balloonPump.emergencyWithdraw(mockToken.address, ethers.utils.parseEther("100"));

      const finalOwnerBalance = await mockToken.balanceOf(owner.address);
      expect(finalOwnerBalance.sub(initialOwnerBalance)).to.equal(ethers.utils.parseEther("100"));
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero address token deposits", async function () {
      await expect(
        balloonPump.connect(user1).deposit(ethers.constants.AddressZero, DEPOSIT_AMOUNT)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should handle insufficient balance deposits", async function () {
      // Try to deposit more than user has approved
      await expect(
        balloonPump.connect(user1).deposit(mockToken.address, INITIAL_BALANCE.mul(2))
      ).to.be.reverted; // Will revert due to ERC20 transferFrom failure
    });

    it("Should handle pump with zero amount", async function () {
      await expect(
        balloonPump.connect(relayer).pump(user1.address, mockToken.address, 0)
      ).to.be.revertedWith("Spend must be positive");
    });
  });
});

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title BalloonPump
 * @dev Advanced balloon pumping game with vaults, rounds, and gasless pumping via relayer
 * @notice Players deposit tokens to vaults, then pump balloons in rounds with risk-reward mechanics
 */
contract BalloonPump is Ownable2Step, ReentrancyGuard, Pausable {
    // ============ Structs ============

    struct Config {
        uint16 feeBps;           // Platform fee in basis points (e.g., 100 = 1%)
        uint128 maxPerPump;      // Maximum tokens per pump action
        uint128 maxPerRoundUser; // Maximum tokens per user per round
        address feeWallet;       // Where platform fees go
        address burnWallet;      // Where burned tokens go (dead address)
        address relayer;         // Authorized relayer for pump() calls
    }

    struct Round {
        uint256 id;
        uint256 pot;             // Total tokens in the round
        uint256 pressure;        // Current pressure (sum of all pump amounts)
        uint256 threshold;       // Pressure threshold to pop balloon
        uint64 openedAt;         // Unix timestamp when round opened
        uint64 poppedAt;         // Unix timestamp when balloon popped (0 if not popped)
        address[3] lastThree;    // Last three pumpers [most recent, second, third]
        bool settled;            // Whether payouts have been distributed
        bool open;               // Whether round is active
    }

    // ============ State Variables ============

    Config public config;

    mapping(address => mapping(address => uint256)) public vaults; // user => token => balance
    mapping(uint256 => Round) public rounds;                       // roundId => Round
    mapping(uint256 => mapping(address => uint256)) public userSpentInRound; // roundId => user => total spent

    uint256 public currentRoundId;
    uint256 private seed; // For randomness fallback

    // ============ Events ============

    event Deposited(address indexed user, address indexed token, uint256 amount, uint256 roundId);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event Pumped(uint256 indexed roundId, address indexed user, address indexed token, uint256 spend, uint256 pressure, uint256 pot);
    event Popped(uint256 indexed roundId, uint256 pot, address indexed last, address indexed second, address indexed third);
    event Settled(uint256 indexed roundId, uint256 winnerAmount, uint256 secondAmount, uint256 thirdAmount, uint256 platformFee, uint256 burnedAmount);

    // ============ Modifiers ============

    modifier onlyRelayer() {
        require(msg.sender == config.relayer, "Only relayer can call");
        _;
    }

    modifier validToken(address token) {
        require(token != address(0), "Invalid token address");
        _;
    }

    // ============ Constructor ============

    constructor() {
        config = Config({
            feeBps: 100, // 1%
            maxPerPump: 1000 * 10**18, // 1000 tokens
            maxPerRoundUser: 10000 * 10**18, // 10000 tokens per round
            feeWallet: address(0), // Set by owner later
            burnWallet: address(0), // Dead address for burns
            relayer: address(0) // Set by owner later
        });

        seed = block.timestamp;
    }

    // ============ Admin Functions ============

    /**
     * @dev Update contract configuration
     * @param feeBps Platform fee in basis points
     * @param maxPerPump Maximum tokens per pump
     * @param maxPerRoundUser Maximum tokens per user per round
     * @param feeWallet Address to receive platform fees
     * @param burnWallet Address to receive burned tokens
     * @param relayer Authorized relayer address
     */
    function setConfig(
        uint16 feeBps,
        uint128 maxPerPump,
        uint128 maxPerRoundUser,
        address feeWallet,
        address burnWallet,
        address relayer
    ) external onlyOwner {
        require(feeBps <= 1000, "Fee cannot exceed 10%"); // Max 10%
        require(maxPerPump > 0 && maxPerRoundUser > 0, "Limits must be positive");
        require(feeWallet != address(0) && burnWallet != address(0) && relayer != address(0), "Addresses cannot be zero");

        config = Config({
            feeBps: feeBps,
            maxPerPump: maxPerPump,
            maxPerRoundUser: maxPerRoundUser,
            feeWallet: feeWallet,
            burnWallet: burnWallet,
            relayer: relayer
        });
    }

    /**
     * @dev Open a new round with specified threshold
     * @param threshold Pressure threshold to pop the balloon
     */
    function openRound(uint256 threshold) external onlyOwner whenNotPaused {
        require(!rounds[currentRoundId].open, "Previous round still open");
        require(threshold > 0, "Threshold must be positive");

        currentRoundId++;

        rounds[currentRoundId] = Round({
            id: currentRoundId,
            pot: 0,
            pressure: 0,
            threshold: threshold,
            openedAt: uint64(block.timestamp),
            poppedAt: 0,
            lastThree: [address(0), address(0), address(0)],
            settled: false,
            open: true
        });
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause after emergency
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ User Functions ============

    /**
     * @dev Deposit tokens to vault (standard ERC20 transfer)
     * @param token Token address to deposit
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        validToken(token)
    {
        require(amount > 0, "Amount must be positive");

        // Transfer tokens from user to contract
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Update vault balance
        vaults[msg.sender][token] += amount;

        emit Deposited(msg.sender, token, amount, currentRoundId);
    }

    /**
     * @dev Deposit tokens to vault with permit (gasless approval)
     * @param token Token address to deposit
     * @param amount Amount to deposit
     * @param deadline Permit deadline
     * @param v Signature component
     * @param r Signature component
     * @param s Signature component
     */
    function depositWithPermit(
        address token,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant whenNotPaused validToken(token) {
        require(amount > 0, "Amount must be positive");

        // Execute permit
        IERC20Permit(token).permit(msg.sender, address(this), amount, deadline, v, r, s);

        // Transfer tokens
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Update vault balance
        vaults[msg.sender][token] += amount;

        emit Deposited(msg.sender, token, amount, currentRoundId);
    }

    /**
     * @dev Withdraw tokens from vault
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount)
        external
        nonReentrant
        validToken(token)
    {
        require(amount > 0, "Amount must be positive");
        require(vaults[msg.sender][token] >= amount, "Insufficient vault balance");

        // Update vault balance
        vaults[msg.sender][token] -= amount;

        // Transfer tokens back to user
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");

        emit Withdrawn(msg.sender, token, amount);
    }

    /**
     * @dev Pump the balloon (only callable by relayer)
     * @param user User performing the pump
     * @param token Token being used
     * @param spend Amount to spend
     */
    function pump(address user, address token, uint256 spend)
        external
        onlyRelayer
        nonReentrant
        whenNotPaused
        validToken(token)
    {
        require(rounds[currentRoundId].open, "No active round");
        require(spend > 0, "Spend must be positive");
        require(spend <= config.maxPerPump, "Exceeds max per pump");
        require(vaults[user][token] >= spend, "Insufficient vault balance");

        // Check user spending limit for this round
        require(userSpentInRound[currentRoundId][user] + spend <= config.maxPerRoundUser, "Exceeds max per round per user");

        Round storage round = rounds[currentRoundId];

        // Deduct from vault
        vaults[user][token] -= spend;

        // Update round state
        uint256 fee = (spend * config.feeBps) / 10000; // Calculate fee
        uint256 netSpend = spend - fee;

        round.pot += netSpend;
        round.pressure += spend;
        userSpentInRound[currentRoundId][user] += spend;

        // Update last three pumpers (shift array)
        round.lastThree[2] = round.lastThree[1];
        round.lastThree[1] = round.lastThree[0];
        round.lastThree[0] = user;

        // Transfer fee to fee wallet
        if (fee > 0) {
            require(IERC20(token).transfer(config.feeWallet, fee), "Fee transfer failed");
        }

        emit Pumped(currentRoundId, user, token, spend, round.pressure, round.pot);

        // Check if balloon should pop
        if (round.pressure >= round.threshold) {
            _popBalloon(token);
        }
    }

    /**
     * @dev Manually trigger balloon pop check (anyone can call)
     * @param token Token address
     */
    function maybePop(address token) external nonReentrant whenNotPaused validToken(token) {
        require(rounds[currentRoundId].open, "No active round");

        Round storage round = rounds[currentRoundId];
        if (round.pressure >= round.threshold) {
            _popBalloon(token);
        }
    }

    /**
     * @dev Settle payouts after balloon pops (anyone can call)
     * @param token Token address
     */
    function settlePayouts(address token) external nonReentrant validToken(token) {
        Round storage round = rounds[currentRoundId];
        require(!round.open, "Round still active");
        require(!round.settled, "Already settled");
        require(round.poppedAt > 0, "Balloon not popped");

        // Distribute rewards
        _distributeRewards(token, round.pot, round.lastThree);

        round.settled = true;
    }

    // ============ Internal Functions ============

    /**
     * @dev Internal function to pop the balloon
     * @param token Token address
     */
    function _popBalloon(address token) internal {
        Round storage round = rounds[currentRoundId];

        round.open = false;
        round.poppedAt = uint64(block.timestamp);

        emit Popped(
            currentRoundId,
            round.pot,
            round.lastThree[0],
            round.lastThree[1],
            round.lastThree[2]
        );

        // Update seed for randomness
        seed = uint256(keccak256(abi.encodePacked(block.timestamp, seed)));
    }

    /**
     * @dev Distribute rewards according to the scheme: 50/25/10 to last three, remainder to burn/platform
     * @param token Token address
     * @param totalPot Total pot to distribute
     * @param lastThree Array of last three pumpers
     */
    function _distributeRewards(address token, uint256 totalPot, address[3] memory lastThree) internal {
        // Calculate payouts
        uint256 winnerAmount = (totalPot * 50) / 100; // 50%
        uint256 secondAmount = (totalPot * 25) / 100; // 25%
        uint256 thirdAmount = (totalPot * 10) / 100;  // 10%
        uint256 remainder = totalPot - winnerAmount - secondAmount - thirdAmount;

        // Platform fee from remainder (configurable)
        uint256 platformFee = (remainder * config.feeBps) / 10000;
        uint256 burnAmount = remainder - platformFee;

        // Distribute to winners
        if (lastThree[0] != address(0) && winnerAmount > 0) {
            vaults[lastThree[0]][token] += winnerAmount;
        }
        if (lastThree[1] != address(0) && secondAmount > 0) {
            vaults[lastThree[1]][token] += secondAmount;
        }
        if (lastThree[2] != address(0) && thirdAmount > 0) {
            vaults[lastThree[2]][token] += thirdAmount;
        }

        // Platform fee
        if (platformFee > 0) {
            require(IERC20(token).transfer(config.feeWallet, platformFee), "Platform fee transfer failed");
        }

        // Burn remainder
        if (burnAmount > 0) {
            require(IERC20(token).transfer(config.burnWallet, burnAmount), "Burn transfer failed");
        }

        emit Settled(
            currentRoundId,
            winnerAmount,
            secondAmount,
            thirdAmount,
            platformFee,
            burnAmount
        );
    }

    // ============ View Functions ============

    /**
     * @dev Get current round information
     * @return Round Current round struct
     */
    function getCurrentRound() external view returns (Round memory) {
        return rounds[currentRoundId];
    }

    /**
     * @dev Get user vault balance
     * @param user User address
     * @param token Token address
     * @return Balance in vault
     */
    function getVaultBalance(address user, address token) external view returns (uint256) {
        return vaults[user][token];
    }

    /**
     * @dev Get user spending in current round
     * @param user User address
     * @return Amount spent in current round
     */
    function getUserSpentInRound(address user) external view returns (uint256) {
        return userSpentInRound[currentRoundId][user];
    }

    /**
     * @dev Get round information by ID
     * @param roundId Round ID
     * @return Round struct
     */
    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    // ============ Emergency Functions ============

    /**
     * @dev Emergency withdrawal of stuck tokens (only owner)
     * @param token Token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            // BNB withdrawal
            payable(owner()).transfer(amount);
        } else {
            // ERC20 withdrawal
            require(IERC20(token).transfer(owner(), amount), "Emergency withdrawal failed");
        }
    }

    // ============ Receive Function ============

    /**
     * @dev Accept BNB deposits (for future BNB support)
     */
    receive() external payable {}

    /**
     * @dev Fallback function
     */
    fallback() external payable {}
}

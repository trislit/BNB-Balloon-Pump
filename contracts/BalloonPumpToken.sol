// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract BalloonPumpToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Game constants
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_REWARD_POOL = 100_000_000 * 10**18; // 100 million for rewards
    uint256 public constant BASE_ENTRY_FEE = 10 * 10**18; // 10 BPM per entry
    uint256 public constant PLATFORM_FEE_PERCENT = 1; // 1% platform fee

    // Game state
    struct Player {
        uint256 vaultBalance;
        uint256 totalPumps;
        uint256 lastPumpTime;
        bool isActive;
    }

    struct PumpRecord {
        address player;
        uint256 amount;
        uint256 timestamp;
    }

    // Game mechanics
    uint256 public currentRoundId;
    uint256 public currentBalloonSize;
    uint256 public totalVaultBalance;
    uint256 public currentJackpot;
    uint256 public totalBurned;

    mapping(address => Player) public players;
    PumpRecord[3] public lastThreePumpers; // Track last 3 pumpers
    uint256 public pumperCount;

    bool public gameActive;
    uint256 public gameStartTime;
    uint256 public lastPopTime;

    // Randomness and difficulty
    uint256 private seed;
    uint256 public basePopProbability = 1000; // Base probability out of 10000
    uint256 public popProbabilityIncrement = 50; // Increases with size

    // Events
    event PlayerEntered(address indexed player, uint256 amount, uint256 roundId);
    event BalloonPumped(address indexed player, uint256 amount, uint256 newSize, uint256 roundId);
    event BalloonPopped(uint256 finalSize, uint256 jackpotAmount, uint256 roundId);
    event NewRoundStarted(uint256 roundId, uint256 startTime);
    event RewardsDistributed(
        address indexed winner,
        uint256 winnerAmount,
        address indexed second,
        uint256 secondAmount,
        address indexed third,
        uint256 thirdAmount,
        uint256 platformFee,
        uint256 burnedAmount,
        uint256 roundId
    );
    event VaultWithdrawn(address indexed player, uint256 amount);

    constructor() ERC20("Balloon Pump Memecoin", "BPM") {
        // Mint initial supply to owner
        _mint(msg.sender, INITIAL_REWARD_POOL);
        gameActive = true;
        gameStartTime = block.timestamp;
        seed = block.timestamp;
        currentRoundId = 1;
    }

    // Enter the game by depositing tokens to vault
    function enterGame(uint256 amount) external nonReentrant {
        require(gameActive, "Game is not active");
        require(amount >= BASE_ENTRY_FEE, "Minimum entry fee required");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Transfer tokens to contract (vault)
        _transfer(msg.sender, address(this), amount);

        // Update player vault
        players[msg.sender].vaultBalance = players[msg.sender].vaultBalance.add(amount);
        players[msg.sender].isActive = true;

        // Update game totals
        totalVaultBalance = totalVaultBalance.add(amount);
        currentJackpot = currentJackpot.add(amount);

        emit PlayerEntered(msg.sender, amount, currentRoundId);
    }

    // Pump the balloon using vault balance
    function pumpBalloon(uint256 pumpAmount) external nonReentrant {
        require(gameActive, "Game is not active");
        require(players[msg.sender].vaultBalance >= pumpAmount, "Insufficient vault balance");
        require(pumpAmount > 0, "Must pump some amount");

        // Deduct from vault
        players[msg.sender].vaultBalance = players[msg.sender].vaultBalance.sub(pumpAmount);

        // Update game state
        currentBalloonSize = currentBalloonSize.add(pumpAmount);
        players[msg.sender].totalPumps = players[msg.sender].totalPumps.add(1);
        players[msg.sender].lastPumpTime = block.timestamp;

        // Update last three pumpers
        _updateLastPumpers(msg.sender, pumpAmount);

        // Check if balloon pops
        if (_shouldBalloonPop()) {
            _popBalloon();
        }

        emit BalloonPumped(msg.sender, pumpAmount, currentBalloonSize, currentRoundId);
    }

    // Internal function to update last three pumpers
    function _updateLastPumpers(address player, uint256 amount) internal {
        // Shift existing records
        lastThreePumpers[2] = lastThreePumpers[1];
        lastThreePumpers[1] = lastThreePumpers[0];
        lastThreePumpers[0] = PumpRecord(player, amount, block.timestamp);
        pumperCount = pumperCount.add(1);
    }

    // Check if balloon should pop based on size and randomness
    function _shouldBalloonPop() internal view returns (bool) {
        if (currentBalloonSize < BASE_ENTRY_FEE) return false;

        // Progressive difficulty: probability increases with balloon size
        uint256 currentProbability = basePopProbability.add(
            currentBalloonSize.div(BASE_ENTRY_FEE).mul(popProbabilityIncrement)
        );

        // Cap at 50% probability
        if (currentProbability > 5000) currentProbability = 5000;

        // Generate pseudo-random number
        uint256 randomValue = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            seed
        ))) % 10000;

        return randomValue < currentProbability;
    }

    // Pop the balloon and distribute rewards
    function _popBalloon() internal {
        uint256 finalSize = currentBalloonSize;
        uint256 jackpotAmount = currentJackpot;
        uint256 completedRoundId = currentRoundId;

        emit BalloonPopped(finalSize, jackpotAmount, completedRoundId);

        // Reset game state for new round
        currentRoundId = currentRoundId.add(1);
        currentBalloonSize = 0;
        currentJackpot = 0;
        lastPopTime = block.timestamp;

        // Update seed for next round
        seed = uint256(keccak256(abi.encodePacked(block.timestamp, seed)));

        // Distribute rewards
        _distributeRewards(jackpotAmount, completedRoundId);

        // Reset last pumpers
        delete lastThreePumpers;
        pumperCount = 0;

        // Start new round
        emit NewRoundStarted(currentRoundId, block.timestamp);
    }

    // Distribute rewards according to the specified percentages
    function _distributeRewards(uint256 totalAmount, uint256 roundId) internal {
        // 85% to last pumper
        uint256 winnerAmount = totalAmount.mul(85).div(100);
        address winner = lastThreePumpers[0].player;

        // 10% to second-to-last pumper
        uint256 secondAmount = totalAmount.mul(10).div(100);
        address second = lastThreePumpers[1].player;

        // 3% to third-to-last pumper
        uint256 thirdAmount = totalAmount.mul(3).div(100);
        address third = lastThreePumpers[2].player;

        // 1% platform fee
        uint256 platformFee = totalAmount.mul(1).div(100);

        // 1% burned from circulation
        uint256 burnAmount = totalAmount.mul(1).div(100);

        // Distribute to winners
        if (winner != address(0)) {
            players[winner].vaultBalance = players[winner].vaultBalance.add(winnerAmount);
            _mint(winner, winnerAmount);
        }

        if (second != address(0)) {
            players[second].vaultBalance = players[second].vaultBalance.add(secondAmount);
            _mint(second, secondAmount);
        }

        if (third != address(0)) {
            players[third].vaultBalance = players[third].vaultBalance.add(thirdAmount);
            _mint(third, thirdAmount);
        }

        // Platform fee to owner
        if (platformFee > 0) {
            _mint(owner(), platformFee);
        }

        // Burn tokens
        if (burnAmount > 0) {
            _mint(address(this), burnAmount);
            _burn(address(this), burnAmount);
            totalBurned = totalBurned.add(burnAmount);
        }

        emit RewardsDistributed(
            winner,
            winnerAmount,
            second,
            secondAmount,
            third,
            thirdAmount,
            platformFee,
            burnAmount,
            roundId
        );
    }

    // Withdraw from vault
    function withdrawFromVault(uint256 amount) external nonReentrant {
        require(players[msg.sender].vaultBalance >= amount, "Insufficient vault balance");
        require(amount > 0, "Must withdraw some amount");

        players[msg.sender].vaultBalance = players[msg.sender].vaultBalance.sub(amount);
        totalVaultBalance = totalVaultBalance.sub(amount);

        _transfer(address(this), msg.sender, amount);

        emit VaultWithdrawn(msg.sender, amount);
    }

    // Emergency functions
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }

    function setGameActive(bool _active) external onlyOwner {
        gameActive = _active;
    }

    function updateGameParameters(uint256 _basePopProbability, uint256 _popIncrement) external onlyOwner {
        basePopProbability = _basePopProbability;
        popProbabilityIncrement = _popIncrement;
    }

    // View functions
    function getPlayerInfo(address player) external view returns (
        uint256 vaultBalance,
        uint256 totalPumps,
        uint256 lastPumpTime,
        bool isActive
    ) {
        Player memory p = players[player];
        return (p.vaultBalance, p.totalPumps, p.lastPumpTime, p.isActive);
    }

    function getLastThreePumpers() external view returns (
        address[3] memory addresses,
        uint256[3] memory amounts,
        uint256[3] memory timestamps
    ) {
        return (
            [lastThreePumpers[0].player, lastThreePumpers[1].player, lastThreePumpers[2].player],
            [lastThreePumpers[0].amount, lastThreePumpers[1].amount, lastThreePumpers[2].amount],
            [lastThreePumpers[0].timestamp, lastThreePumpers[1].timestamp, lastThreePumpers[2].timestamp]
        );
    }

    function getGameStats() external view returns (
        uint256 roundId,
        uint256 balloonSize,
        uint256 vaultBalance,
        uint256 jackpot,
        uint256 burned,
        bool active,
        uint256 startTime,
        uint256 popProbability
    ) {
        uint256 currentProbability = basePopProbability.add(
            currentBalloonSize.div(BASE_ENTRY_FEE).mul(popProbabilityIncrement)
        );
        if (currentProbability > 5000) currentProbability = 5000;

        return (
            currentRoundId,
            currentBalloonSize,
            totalVaultBalance,
            currentJackpot,
            totalBurned,
            gameActive,
            gameStartTime,
            currentProbability
        );
    }

    function getRoundInfo(uint256 roundId) external view returns (
        uint256 roundStartTime,
        uint256 finalSize,
        uint256 jackpotAmount,
        bool isCompleted
    ) {
        // For current round
        if (roundId == currentRoundId) {
            return (gameStartTime, currentBalloonSize, currentJackpot, false);
        }

        // For completed rounds, we'd need historical data
        // For now, return zeros for past rounds
        return (0, 0, 0, true);
    }

    // Receive BNB
    receive() external payable {}
}


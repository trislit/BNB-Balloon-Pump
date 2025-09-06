import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { GameEngine } from '../game/engine.js';
import { BlockchainService } from '../contracts/blockchain.js';
import { DatabaseService } from './database.js';
import { ethers } from 'ethers';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const gameEngine = new GameEngine();
const blockchainService = new BlockchainService();
const databaseService = new DatabaseService();

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    gameActive: true,
    timestamp: new Date().toISOString(),
    services: {
      database: databaseService.isConnected ? 'connected' : 'disconnected'
    }
  });
});

// MetaMask Authentication
app.post('/api/auth/challenge', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Generate a unique challenge message
    const challenge = `BNB Balloon Pump Game Authentication\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}\nPlease sign this message to authenticate.`;

    // Store challenge temporarily (you might want to store this in Redis/database for production)
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // For now, we'll store it in memory (use Redis in production)
    if (!global.challenges) global.challenges = new Map();
    global.challenges.set(challengeId, {
      walletAddress: walletAddress.toLowerCase(),
      challenge,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    res.json({
      challengeId,
      challenge,
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (error) {
    console.error('Error generating auth challenge:', error);
    res.status(500).json({ error: 'Failed to generate authentication challenge' });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    console.log('🔐 Verifying authentication signature...');
    const { challengeId, signature } = req.body;
    console.log('Challenge ID:', challengeId);
    console.log('Signature received:', signature ? 'Yes' : 'No');

    if (!challengeId || !signature) {
      return res.status(400).json({ error: 'Challenge ID and signature required' });
    }

    // Get stored challenge
    if (!global.challenges) global.challenges = new Map();
    const storedChallenge = global.challenges.get(challengeId);

    if (!storedChallenge) {
      return res.status(400).json({ error: 'Challenge not found or expired' });
    }

    if (Date.now() > storedChallenge.expiresAt) {
      global.challenges.delete(challengeId);
      return res.status(400).json({ error: 'Challenge expired' });
    }

    // Verify signature
    const messageHash = ethers.hashMessage(storedChallenge.challenge);
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);

    if (recoveredAddress.toLowerCase() !== storedChallenge.walletAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Clean up used challenge
    global.challenges.delete(challengeId);

    // Check if user exists, create if not
    console.log('🔍 Checking for existing user:', storedChallenge.walletAddress);
    let user = await databaseService.getUserSessionByWallet(storedChallenge.walletAddress);
    console.log('Existing user found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('👤 Creating new user...');
      // Create new user with starting tokens
      user = await databaseService.createUserSession(
        storedChallenge.walletAddress,
        `Player_${storedChallenge.walletAddress.slice(-6)}`,
        {
          gameStats: {
            totalGames: 0,
            totalPumps: 0,
            totalWins: 0,
            totalEarnings: "0",
            bestWin: "0"
          },
          tokenBalance: "1000", // Starting tokens for testing
          preferences: {
            soundEnabled: true,
            animationsEnabled: true,
            theme: "dark"
          }
        }
      );

      console.log(`🎉 New user created:`, user ? user.session_id : 'FAILED');
      if (!user) {
        return res.status(500).json({ error: 'Failed to create user account' });
      }
    } else {
      console.log('✅ Using existing user:', user.session_id);
      // Update existing user
      user = await databaseService.updateUserSession(user.sessionId, {
        lastActivity: new Date().toISOString()
      });
    }

    // Log authentication action
    await databaseService.logUserAction(
      user.sessionId,
      storedChallenge.walletAddress,
      'authenticate',
      {
        method: 'metamask',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    const responseData = {
      success: true,
      user: {
        sessionId: user.sessionId,
        walletAddress: user.walletAddress,
        playerName: user.playerName,
        tokenBalance: user.tokenBalance || user.gameStats?.tokenBalance || "1000",
        gameStats: user.gameStats,
        preferences: user.preferences
      }
    };

    console.log('📤 Sending authentication response:', {
      sessionId: user.sessionId,
      walletAddress: user.walletAddress,
      playerName: user.playerName,
      tokenBalance: responseData.user.tokenBalance
    });

    res.json(responseData);
  } catch (error) {
    console.error('Error verifying auth:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get user profile
app.get('/api/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const user = await databaseService.getUserSessionByWallet(walletAddress.toLowerCase());

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      sessionId: user.sessionId,
      walletAddress: user.walletAddress,
      playerName: user.playerName,
      tokenBalance: user.tokenBalance || user.gameStats?.tokenBalance || "1000",
      gameStats: user.gameStats,
      preferences: user.preferences,
      lastActivity: user.lastActivity
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user preferences
app.put('/api/user/:sessionId/preferences', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { preferences } = req.body;

    const user = await databaseService.getUserSession(sessionId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await databaseService.updateUserSession(sessionId, { preferences });

    res.json({
      success: true,
      preferences: updatedUser.preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

app.get('/api/game/state', async (req, res) => {
  try {
    const gameState = await gameEngine.getCurrentState();
    res.json(gameState);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/game/join', async (req, res) => {
  try {
    const { walletAddress, playerName } = req.body;

    // Check if user already has an active session
    let userSession = await databaseService.getUserSessionByWallet(walletAddress);

    if (userSession) {
      // Update existing session
      userSession = await databaseService.updateUserSession(userSession.sessionId, {
        playerName,
        isActive: true
      });
    } else {
      // Create new session
      userSession = await databaseService.createUserSession(walletAddress, playerName);
    }

    // Set wallet context for database operations
    databaseService.setWalletContext(walletAddress);

    // Log user action
    await databaseService.logUserAction(userSession.sessionId, walletAddress, 'join_game', {
      playerName,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const player = await gameEngine.addPlayer(userSession.sessionId, playerName);
    res.json({
      ...player,
      sessionId: userSession.sessionId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/game/deposit', async (req, res) => {
  try {
    const { sessionId, amount } = req.body;

    // Get user session
    const userSession = await databaseService.getUserSession(sessionId);
    if (!userSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Set wallet context
    databaseService.setWalletContext(userSession.walletAddress);

    // Deposit tokens to user's balance
    const depositResult = await databaseService.depositTokens(sessionId, amount);

    if (!depositResult) {
      return res.status(500).json({ error: 'Failed to deposit tokens' });
    }

    // Log user action
    await databaseService.logUserAction(sessionId, userSession.walletAddress, 'deposit_vault', {
      amount: amount.toString(),
      newBalance: depositResult.token_balance
    });

    const result = {
      success: true,
      vaultBalance: depositResult.token_balance,
      message: `Successfully deposited ${amount} BPM tokens`
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/game/pump', async (req, res) => {
  try {
    const { sessionId, pumpAmount } = req.body;

    // Get user session
    const userSession = await databaseService.getUserSession(sessionId);
    if (!userSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Set wallet context
    databaseService.setWalletContext(userSession.walletAddress);

    // Check if user has enough tokens
    const currentBalance = parseFloat(await databaseService.getTokenBalance(sessionId));
    if (currentBalance < pumpAmount) {
      return res.status(400).json({
        error: 'Insufficient token balance',
        required: pumpAmount,
        available: currentBalance
      });
    }

    // Spend tokens for pumping
    const spendResult = await databaseService.spendTokens(sessionId, pumpAmount);
    if (!spendResult) {
      return res.status(500).json({ error: 'Failed to spend tokens' });
    }

    // Process the pump action
    const result = await gameEngine.pumpBalloon(sessionId, pumpAmount);

    // If balloon popped and user won, award them the prize
    if (result.success === false && result.jackpot) {
      const jackpotAmount = parseFloat(result.jackpot);
      await databaseService.awardTokens(sessionId, jackpotAmount, 'jackpot_win');
      result.newBalance = (parseFloat(spendResult.token_balance) + jackpotAmount).toString();
    } else {
      result.newBalance = spendResult.token_balance;
    }

    // Log user action
    await databaseService.logUserAction(sessionId, userSession.walletAddress, 'pump_balloon', {
      pumpAmount: pumpAmount.toString(),
      popProbability: result.popProbability,
      newBalance: result.newBalance
    });

    // Update session activity
    await databaseService.updateUserSession(sessionId, {});

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/game/withdraw', async (req, res) => {
  try {
    const { playerId, amount } = req.body;
    const result = await gameEngine.withdrawFromVault(playerId, amount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/game/cashout', async (req, res) => {
  try {
    const { playerId } = req.body;
    const result = await gameEngine.cashOut(playerId);

    // If successful cashout, mint tokens on blockchain
    if (result.success) {
      await blockchainService.mintTokens(result.reward);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get game statistics
app.get('/api/game/stats', async (req, res) => {
  try {
    const gameStats = await blockchainService.getGameStats();
    res.json(gameStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get player information
app.get('/api/player/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const playerInfo = await blockchainService.getPlayerInfo(address);
    res.json(playerInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get last three pumpers
app.get('/api/game/pumpers', async (req, res) => {
  try {
    const pumpers = await blockchainService.getLastThreePumpers();
    res.json(pumpers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Session Management
app.get('/api/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await databaseService.getUserSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.sessionId,
      walletAddress: session.walletAddress,
      playerName: session.playerName,
      isActive: session.isActive,
      lastActivity: session.lastActivity,
      gameStats: session.gameStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/session/end/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await databaseService.endUserSession(sessionId);
    res.json({ success: true, message: 'Session ended successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics Endpoints
app.get('/api/analytics/user/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const stats = await databaseService.getUserStats(walletAddress);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/game', async (req, res) => {
  try {
    const stats = await databaseService.getGameStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Actions History
app.get('/api/actions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;

    // This would need to be implemented in the database service
    // For now, return empty array
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cache Management
app.get('/api/cache/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const cached = await databaseService.getCachedBlockchainData(key);

    if (cached) {
      res.json({ cached: true, data: cached });
    } else {
      res.json({ cached: false, message: 'Cache miss' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO for real-time game updates
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('join-game', async (data) => {
    try {
      const player = await gameEngine.addPlayer(socket.id, data.playerName);
      socket.emit('player-joined', player);
      socket.broadcast.emit('player-update', { playerId: socket.id, action: 'joined' });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('pump-balloon', async () => {
    try {
      const result = await gameEngine.pumpBalloon(socket.id);

      if (result.success) {
        // Generate real-time AI image
        if (mcpManager.clients.has('pixellab')) {
          const imagePrompt = `Balloon pump game, balloon size: ${result.balloonSize}%, player: ${socket.id}, memecoin style`;
          const imageResult = await mcpManager.generateImage(imagePrompt);
          result.imageUrl = imageResult?.imageUrl;
        }

        socket.emit('pump-success', result);
        socket.broadcast.emit('game-update', {
          playerId: socket.id,
          action: 'pump',
          balloonSize: result.balloonSize
        });
      } else {
        socket.emit('pump-failed', result);
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('cash-out', async () => {
    try {
      const result = await gameEngine.cashOut(socket.id);

      if (result.success) {
        socket.emit('cashout-success', result);
        socket.broadcast.emit('game-update', {
          playerId: socket.id,
          action: 'cashout',
          reward: result.reward
        });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    gameEngine.removePlayer(socket.id);
    socket.broadcast.emit('player-update', { playerId: socket.id, action: 'left' });
  });
});

// Initialize services on startup
async function initializeServices() {
  try {
    console.log('🎮 Starting session manager...');
    await gameEngine.initialize();

    console.log('⛓️  Initializing blockchain connector...');
    await blockchainService.initialize();

    console.log('🗄️  Initializing database service...');
    await databaseService.initialize();

    console.log('🔌 Initializing external service connectors...');
    // MCP servers would be initialized here for development assistance

    console.log('✅ Session management system initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing services:', error);
    console.error('Stack trace:', error.stack);
    // Don't exit the process, just log the error and continue
    console.log('⚠️  Continuing with partial initialization...');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, async () => {
  console.log(`🎯 BNB Balloon Pump Session Manager running on port ${PORT}`);
  console.log(`🌐 Frontend should connect to: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`⛓️  Blockchain: Connected to BNB Smart Chain`);
  console.log(`🎮 Game Logic: Handled by smart contract`);
  console.log(`🔌 External Services: Ready for MCP integration`);

  // Initialize services after server starts
  await initializeServices();
});


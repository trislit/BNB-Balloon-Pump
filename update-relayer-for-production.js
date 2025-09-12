#!/usr/bin/env node

/**
 * Update Relayer for Production
 * This script updates the relayer service to use the new production functions
 */

const fs = require('fs');
const path = require('path');

// Test token configuration
const TEST_TOKEN_ADDRESS = '0xTEST0000000000000000000000000000000000000';

// Update TestModeService to use production functions
const testModeServicePath = 'apps/relayer/src/services/TestModeService.ts';

let testModeService = fs.readFileSync(testModeServicePath, 'utf8');

// Replace the simulatePump function
testModeService = testModeService.replace(
  /async simulatePump\(walletAddress: string, pumpAmount: string\): Promise<PumpResult> \{[\s\S]*?\}/,
  `async simulatePump(walletAddress: string, pumpAmount: string): Promise<PumpResult> {
    try {
      const { data, error } = await this.supabase.rpc('pump_balloon', {
        user_address: walletAddress,
        token_address: '${TEST_TOKEN_ADDRESS}', // Test Token (meme coin placeholder)
        pump_amount: parseFloat(pumpAmount)
      });

      if (error) {
        throw error;
      }

      return {
        success: data.success,
        requestId: \`pump_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
        transactionHash: data.balloon_popped ? \`pop_\${Date.now()}\` : undefined,
        blockNumber: Date.now(),
        gasUsed: '0',
        duration: 100,
        error: data.error,
        pending: false,
        // Include game result data
        balloon_popped: data.balloon_popped,
        pressure: data.pressure,
        pot: data.pot,
        winner: data.winner,
        winner_payout: data.winner_payout,
        second_payout: data.second_payout,
        third_payout: data.third_payout,
        pop_reason: data.pop_reason,
        game_ended: data.game_ended
      };
    } catch (error) {
      console.error('Simulate pump error:', error);
      return {
        success: false,
        requestId: \`error_\${Date.now()}\`,
        error: error.message,
        pending: false
      };
    }
  }`
);

// Replace the getUserBalance function
testModeService = testModeService.replace(
  /async getUserBalance\(walletAddress: string\): Promise<string> \{[\s\S]*?\}/,
  `async getUserBalance(walletAddress: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_balance', {
        user_address: walletAddress,
        token_address: '${TEST_TOKEN_ADDRESS}' // Test Token (meme coin placeholder)
      });

      if (error) {
        throw error;
      }

      return data.balance.toString();
    } catch (error) {
      console.error('Get user balance error:', error);
      return '0';
    }
  }`
);

// Replace the getGameState function
testModeService = testModeService.replace(
  /async getGameState\(\): Promise<any> \{[\s\S]*?\}/,
  `async getGameState(): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc('get_token_game_status', {
        token_address: '${TEST_TOKEN_ADDRESS}' // Test Token (meme coin placeholder)
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        return {
          roundId: 1,
          currentPressure: 0,
          pressure: 0,
          maxPressure: 1000,
          potAmount: '0',
          pot: '0',
          participantCount: 0,
          lastPumpedBy: null,
          timeRemaining: null,
          status: 'active',
          lastPumpers: [],
          riskLevel: 'LOW',
          pressurePercentage: 0
        };
      }

      // Calculate risk level and pressure percentage
      const pressure = parseFloat(data.pressure || 0);
      const pressurePercentage = Math.min((pressure / 1000) * 100, 200);
      
      let riskLevel = 'LOW';
      if (pressurePercentage >= 200) riskLevel = 'EXTREME';
      else if (pressurePercentage >= 150) riskLevel = 'VERY HIGH';
      else if (pressurePercentage >= 120) riskLevel = 'HIGH';
      else if (pressurePercentage >= 80) riskLevel = 'MEDIUM';

      return {
        roundId: data.round_number,
        currentPressure: pressure,
        pressure: pressure,
        maxPressure: 1000,
        potAmount: data.pot_amount?.toString() || '0',
        pot: data.pot_amount?.toString() || '0',
        participantCount: data.total_pumps || 0,
        lastPumpedBy: data.winner_address,
        timeRemaining: null,
        status: data.status,
        lastPumpers: [data.winner_address, data.second_address, data.third_address].filter(Boolean),
        riskLevel,
        pressurePercentage: Math.round(pressurePercentage * 100) / 100
      };
    } catch (error) {
      console.error('Get game state error:', error);
      return {
        roundId: 1,
        currentPressure: 0,
        pressure: 0,
        maxPressure: 1000,
        potAmount: '0',
        pot: '0',
        participantCount: 0,
        lastPumpedBy: null,
        timeRemaining: null,
        status: 'active',
        lastPumpers: [],
        riskLevel: 'LOW',
        pressurePercentage: 0
      };
    }
  }`
);

// Add new methods for deposits and withdrawals
const newMethods = `
  async depositToVault(walletAddress: string, amount: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('deposit_tokens', {
        user_address: walletAddress,
        token_address: '${TEST_TOKEN_ADDRESS}', // Test Token (meme coin placeholder)
        amount: parseFloat(amount)
      });

      if (error) {
        throw error;
      }

      return data.success;
    } catch (error) {
      console.error('Deposit error:', error);
      return false;
    }
  }

  async withdrawFromVault(walletAddress: string, amount: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('withdraw_tokens', {
        user_address: walletAddress,
        token_address: '${TEST_TOKEN_ADDRESS}', // Test Token (meme coin placeholder)
        amount: parseFloat(amount)
      });

      if (error) {
        throw error;
      }

      return data.success;
    } catch (error) {
      console.error('Withdraw error:', error);
      return false;
    }
  }

  async getHistoricalGames(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_historical_games', {
        token_address: '${TEST_TOKEN_ADDRESS}', // Test Token (meme coin placeholder)
        limit_count: limit
      });

      if (error) {
        throw error;
      }

      return data.games || [];
    } catch (error) {
      console.error('Get historical games error:', error);
      return [];
    }
  }
`;

// Add the new methods before the closing brace
testModeService = testModeService.replace(
  /(\s+)\}\s*$/,
  `$1${newMethods}$1}`
);

// Write the updated file
fs.writeFileSync(testModeServicePath, testModeService);

console.log('✅ Updated TestModeService for production');

// Update RelayerService to use production functions
const relayerServicePath = 'apps/relayer/src/services/RelayerService.ts';

let relayerService = fs.readFileSync(relayerServicePath, 'utf8');

// Update the applyOptimisticUpdate function
relayerService = relayerService.replace(
  /private async applyOptimisticUpdate\(request: PumpRequest\): Promise<\{ success: boolean; error\?: string; pumpResult\?: any \}> \{[\s\S]*?\}/,
  `private async applyOptimisticUpdate(request: PumpRequest): Promise<{ success: boolean; error?: string; pumpResult?: any }> {
    try {
      const { data, error } = await this.supabase.rpc('pump_balloon', {
        user_address: request.userAddress,
        token_address: '${TEST_TOKEN_ADDRESS}', // Test Token (meme coin placeholder)
        pump_amount: parseFloat(request.amount.toString())
      });

      if (error) {
        throw error;
      }

      return {
        success: data.success,
        pumpResult: data
      };
    } catch (error) {
      console.error('Optimistic update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }`
);

// Write the updated file
fs.writeFileSync(relayerServicePath, relayerService);

console.log('✅ Updated RelayerService for production');

// Create a new API endpoint for historical games
const pumpRoutesPath = 'apps/relayer/src/routes/pump.ts';

let pumpRoutes = fs.readFileSync(pumpRoutesPath, 'utf8');

// Add historical games endpoint
const historicalGamesEndpoint = `
  // GET /api/pump/historical-games - Get historical games
  router.get('/historical-games', async (req: Request, res: Response) => {
    try {
      const { limit = '10' } = req.query;
      const limitNum = parseInt(Array.isArray(limit) ? limit[0] as string : (limit as string) || '10');

      const supabase = relayerService['supabase'];
      
      const { data, error } = await supabase.rpc('get_historical_games', {
        token_address: '${TEST_TOKEN_ADDRESS}', // Test Token (meme coin placeholder)
        limit_count: limitNum
      });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        games: data.games || [],
        count: data.count || 0,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('❌ Error getting historical games:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });
`;

// Add the endpoint before the last router.get
pumpRoutes = pumpRoutes.replace(
  /(\s+)(\/\/ GET \/api\/pump\/:requestId - Get pump request status \(MUST BE LAST\))/,
  `$1${historicalGamesEndpoint}$1$2`
);

// Write the updated file
fs.writeFileSync(pumpRoutesPath, pumpRoutes);

console.log('✅ Added historical games endpoint');

console.log('\n🎉 Relayer service updated for production!');
console.log(`\n📋 Using test token: ${TEST_TOKEN_ADDRESS}`);
console.log('\n📋 Next steps:');
console.log('1. Run the production cleanup script in Supabase');
console.log('2. Test the production system');
console.log('3. Deploy the updated relayer service');
console.log('4. Update the frontend to use the new API endpoints');
console.log('\n💡 Note: This is designed for meme coins in the future. Currently using test tokens for development without real blockchain integration (except for wallet login).');
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { PumpRequest, PumpResult } from '../types';

export class TestModeService {
  private supabase: SupabaseClient;

  constructor() {
    this.initializeSupabase();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for test mode');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // Create or get user profile with test tokens
  async getOrCreateUser(walletAddress: string): Promise<any> {
    try {
      // Check if user exists
      let { data: user, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('evm_address', walletAddress.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Create user if doesn't exist
      if (!user) {
        const { data: newUser, error: createError } = await this.supabase
          .from('profiles')
          .insert([{
            evm_address: walletAddress.toLowerCase(),
            test_tokens: '1000' // Starting balance
          }])
          .select()
          .single();

        if (createError) throw createError;
        user = newUser;

        logger.info(`✅ Created test user: ${walletAddress} with 1000 test tokens`);
      }

      return user;
    } catch (error) {
      logger.error('❌ Error getting/creating user:', error);
      throw error;
    }
  }

  // Simulate deposit (add test tokens to user balance)
  async simulateDeposit(walletAddress: string, amount: string): Promise<boolean> {
    try {
      // Get current balance
      const user = await this.getOrCreateUser(walletAddress);
      const currentBalance = parseFloat(user.test_tokens || '0');
      const depositAmount = parseFloat(amount);
      const newBalance = currentBalance + depositAmount;

      // Update balance
      const { error } = await this.supabase
        .from('profiles')
        .update({ test_tokens: newBalance.toString() })
        .eq('evm_address', walletAddress.toLowerCase());

      if (error) throw error;

      // Record transaction
      await this.supabase
        .from('token_transactions')
        .insert([{
          user_id: walletAddress.toLowerCase(),
          transaction_type: 'deposit',
          amount: amount
        }]);

      logger.info(`✅ Simulated deposit: ${walletAddress} +${amount} test tokens`);
      return true;
    } catch (error) {
      logger.error('❌ Error simulating deposit:', error);
      return false;
    }
  }

  // Simulate withdraw (remove test tokens from user balance)
  async simulateWithdraw(walletAddress: string, amount: string): Promise<boolean> {
    try {
      const user = await this.getOrCreateUser(walletAddress);
      const currentBalance = parseFloat(user.test_tokens || '0');
      const withdrawAmount = parseFloat(amount);

      if (currentBalance < withdrawAmount) {
        logger.warn(`❌ Insufficient balance: ${walletAddress} has ${currentBalance}, needs ${withdrawAmount}`);
        return false;
      }

      const newBalance = currentBalance - withdrawAmount;

      const { error } = await this.supabase
        .from('profiles')
        .update({ test_tokens: newBalance.toString() })
        .eq('evm_address', walletAddress.toLowerCase());

      if (error) throw error;

      // Record transaction
      await this.supabase
        .from('token_transactions')
        .insert([{
          user_id: walletAddress.toLowerCase(),
          transaction_type: 'withdraw',
          amount: amount
        }]);

      logger.info(`✅ Simulated withdraw: ${walletAddress} -${amount} test tokens`);
      return true;
    } catch (error) {
      logger.error('❌ Error simulating withdraw:', error);
      return false;
    }
  }

  // Simulate pump action using database functions
  async simulatePump(walletAddress: string, pumpAmount: string): Promise<PumpResult> {
    try {
      logger.info(`🎈 Simulating pump: ${walletAddress} pumping ${pumpAmount} tokens`);

      // Check user has enough tokens
      const user = await this.getOrCreateUser(walletAddress);
      const currentBalance = parseFloat(user.test_tokens || '0');
      const pumpCost = parseFloat(pumpAmount);

      if (currentBalance < pumpCost) {
        return {
          success: false,
          requestId: `pump_${Date.now()}`,
          error: 'Insufficient test tokens'
        };
      }

      // Deduct tokens from user
      const newBalance = currentBalance - pumpCost;
      await this.supabase
        .from('profiles')
        .update({ test_tokens: newBalance.toString() })
        .eq('evm_address', walletAddress.toLowerCase());

      // Use database function to simulate pump
      logger.info(`🎮 Calling simulate_pump_hybrid with:`, {
        user_address: walletAddress.toLowerCase(),
        pump_amount: pumpAmount,
        is_test: true
      });

      let pumpResult;
      try {
        const { data, error } = await this.supabase
          .rpc('simulate_pump_hybrid', {
            user_address: walletAddress.toLowerCase(),
            pump_amount: pumpAmount,
            is_test: true
          });

        if (error) {
          logger.error('❌ Database function error:', error);
          logger.error('❌ Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          
          // If function doesn't exist, use fallback
          if (error.code === '42883' || error.code === 'PGRST202') {
            logger.warn('⚠️ Function simulate_pump_hybrid not found, using fallback');
            pumpResult = await this.fallbackPumpSimulation(walletAddress, pumpAmount);
          } else {
            throw error;
          }
        } else {
          pumpResult = data;
        }
      } catch (error) {
        logger.error('❌ Exception calling pump function:', error);
        logger.warn('⚠️ Using fallback pump simulation');
        pumpResult = await this.fallbackPumpSimulation(walletAddress, pumpAmount);
      }

      logger.info('🎮 Pump result from database:', pumpResult);
      
      if (!pumpResult || pumpResult.length === 0) {
        logger.warn('⚠️ No result returned from pump function, using fallback');
        pumpResult = await this.fallbackPumpSimulation(walletAddress, pumpAmount);
      }

      // Record pump transaction
      await this.supabase
        .from('token_transactions')
        .insert([{
          user_id: walletAddress.toLowerCase(),
          transaction_type: 'pump',
          amount: pumpAmount,
          round_id: 1
        }]);

      // Update user stats in leaderboard
      await this.updateLeaderboardStats(walletAddress.toLowerCase(), pumpAmount);

      logger.info(`✅ Pump simulated: ${walletAddress} -${pumpAmount} tokens, new balance: ${newBalance}`);

      return {
        success: true,
        requestId: `pump_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionHash: `test_tx_${Date.now()}`,
        blockNumber: Math.floor(Date.now() / 1000),
        gasUsed: '21000',
        duration: 100
      };

    } catch (error) {
      logger.error('❌ Error simulating pump:', error);
      return {
        success: false,
        requestId: `pump_${Date.now()}`,
        error: (error as Error).message
      };
    }
  }

  // Update leaderboard statistics
  private async updateLeaderboardStats(walletAddress: string, pumpAmount: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('leaderboard')
        .upsert({
          user_id: walletAddress,
          total_pumps: 1,
          net_winnings: '0'
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        // If upsert doesn't work, try update
        await this.supabase
          .from('leaderboard')
          .update({
            total_pumps: 'total_pumps + 1'
          })
          .eq('user_id', walletAddress);
      }
    } catch (error) {
      logger.warn('⚠️ Could not update leaderboard stats:', (error as Error).message);
    }
  }

  // Get user balance
  async getUserBalance(walletAddress: string): Promise<string> {
    try {
      const user = await this.getOrCreateUser(walletAddress);
      return user.test_tokens || '0';
    } catch (error) {
      logger.error('❌ Error getting user balance:', error);
      return '0';
    }
  }

  // Get current game state
  async getGameState(): Promise<any> {
    try {
      // Use the new function to get current game state
      const { data, error } = await this.supabase
        .rpc('get_current_game_state');

      if (error) {
        logger.error('❌ Error calling get_current_game_state:', error);
        logger.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // If function doesn't exist, use fallback
        if (error.code === '42883' || error.code === 'PGRST202') {
          logger.warn('⚠️ Function get_current_game_state not found, using fallback');
          return await this.fallbackGetGameState();
        } else {
          throw error;
        }
      }

      logger.info('🎮 Raw game state from database:', data);

      if (data && data.length > 0) {
        const gameState = data[0];
        return {
          roundId: gameState.round_id,
          status: gameState.status,
          pressure: parseFloat(gameState.pressure || '0'),
          pot: parseFloat(gameState.pot || '0'),
          lastPumpers: [gameState.last1, gameState.last2, gameState.last3].filter(addr => addr),
          participantCount: gameState.participant_count || 0,
          riskLevel: gameState.risk_level || 'LOW',
          pressurePercentage: parseFloat(gameState.pressure_percentage || '0')
        };
      } else {
        // Fallback to direct query if function doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await this.supabase
          .from('rounds_cache')
          .select('*')
          .eq('status', 'active')
          .order('round_id', { ascending: false })
          .limit(1)
          .single();

        if (fallbackError) throw fallbackError;

        return {
          roundId: fallbackData.round_id,
          status: fallbackData.status,
          pressure: parseFloat(fallbackData.pressure || '0'),
          pot: parseFloat(fallbackData.pot || '0'),
          lastPumpers: [fallbackData.last1, fallbackData.last2, fallbackData.last3].filter(addr => addr),
          participantCount: 0,
          riskLevel: 'LOW',
          pressurePercentage: parseFloat(fallbackData.pressure || '0')
        };
      }
    } catch (error) {
      logger.error('❌ Error getting game state:', error);
      return {
        roundId: 1,
        status: 'active',
        pressure: 0,
        pot: 0,
        lastPumpers: [],
        participantCount: 0,
        riskLevel: 'LOW',
        pressurePercentage: 0
      };
    }
  }

  // Get user transaction history
  async getUserTransactions(walletAddress: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', walletAddress.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('❌ Error getting user transactions:', error);
      return [];
    }
  }

  // Get leaderboard
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('leaderboard')
        .select(`
          *,
          profiles!inner(evm_address, ens_name)
        `)
        .order('net_winnings', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('❌ Error getting leaderboard:', error);
      return [];
    }
  }

  // Fallback pump simulation when database function is not available
  private async fallbackPumpSimulation(walletAddress: string, pumpAmount: string): Promise<any[]> {
    try {
      logger.info('🔄 Using fallback pump simulation');
      logger.info('🔄 Fallback parameters:', { walletAddress, pumpAmount });
      
      // Simple fallback: just update the rounds_cache directly
      const pumpValue = parseFloat(pumpAmount);
      const pressureIncrease = pumpValue / 8; // Simple 1/8th pressure increase
      const potContribution = pumpValue * 0.1; // 10% to pot
      
      logger.info('🔄 Calculated values:', { pumpValue, pressureIncrease, potContribution });
      
      // Get current round state
      logger.info('🔄 Querying rounds_cache for round_id = 1');
      const { data: currentRound, error: roundError } = await this.supabase
        .from('rounds_cache')
        .select('*')
        .eq('round_id', 1)
        .single();

      logger.info('🔄 Round query result:', { currentRound, roundError });

      if (roundError && roundError.code !== 'PGRST116') {
        logger.error('🔄 Round query error:', roundError);
        throw roundError;
      }

      let currentPressure = 0;
      let currentPot = 0;

      if (currentRound) {
        currentPressure = parseFloat(currentRound.pressure || '0');
        currentPot = parseFloat(currentRound.pot || '0');
      } else {
        // Create initial round if it doesn't exist
        await this.supabase
          .from('rounds_cache')
          .insert({
            round_id: 1,
            status: 'active',
            pressure: '0',
            pot: '0',
            last1: null,
            last2: null,
            last3: null
          });
      }

      const newPressure = currentPressure + pressureIncrease;
      const newPot = currentPot + potContribution;

      // Check if balloon should pop (pressure >= 100)
      const balloonPopped = newPressure >= 100;
      let winnerReward = 0;

      if (balloonPopped) {
        // Calculate winner reward (85% of pot)
        winnerReward = newPot * 0.85;
        
        logger.info('💥 Balloon popped! Awarding winner:', {
          winner: walletAddress.toLowerCase(),
          reward: winnerReward,
          pot: newPot
        });

        // Award winner tokens - get current balance first
        const { data: currentUser, error: userError } = await this.supabase
          .from('profiles')
          .select('test_tokens')
          .eq('evm_address', walletAddress.toLowerCase())
          .single();

        if (userError) {
          logger.error('🔄 Error getting user balance for reward:', userError);
        } else {
          const currentBalance = parseFloat(currentUser.test_tokens || '0');
          const newBalance = currentBalance + winnerReward;
          
          const { error: rewardError } = await this.supabase
            .from('profiles')
            .update({
              test_tokens: newBalance.toString()
            })
            .eq('evm_address', walletAddress.toLowerCase());

          if (rewardError) {
            logger.error('🔄 Reward error:', rewardError);
          } else {
            logger.info('🔄 Winner rewarded successfully:', { newBalance });
          }
        }

        // Reset the round for next game
        const { error: resetError } = await this.supabase
          .from('rounds_cache')
          .update({
            pressure: '0',
            pot: '0',
            last1: null,
            last2: null,
            last3: null,
            status: 'active'
          })
          .eq('round_id', 1);

        if (resetError) {
          logger.error('🔄 Reset error:', resetError);
          throw resetError;
        }

        logger.info('🔄 Game reset for new round');

        // Return popped result
        return [{
          success: true,
          new_pressure: '0',
          new_pot: '0',
          balloon_popped: true,
          winner_reward: winnerReward.toString(),
          pop_threshold: '100',
          risk_level: 'LOW'
        }];
      } else {
        // Normal pump - update the round
        logger.info('🔄 Updating round with:', {
          newPressure,
          newPot,
          last1: walletAddress.toLowerCase(),
          last2: currentRound?.last1 || null,
          last3: currentRound?.last2 || null
        });

        const { error: updateError } = await this.supabase
          .from('rounds_cache')
          .update({
            pressure: newPressure.toString(),
            pot: newPot.toString(),
            last3: currentRound?.last2 || null,
            last2: currentRound?.last1 || null,
            last1: walletAddress.toLowerCase()
          })
          .eq('round_id', 1);

        if (updateError) {
          logger.error('🔄 Update error:', updateError);
          throw updateError;
        }

        logger.info('🔄 Round updated successfully');

        // Return normal result
        return [{
          success: true,
          new_pressure: newPressure.toString(),
          new_pot: newPot.toString(),
          balloon_popped: false,
          winner_reward: '0',
          pop_threshold: '100',
          risk_level: newPressure > 90 ? 'EXTREME' : newPressure > 70 ? 'HIGH' : newPressure > 50 ? 'MEDIUM' : 'LOW'
        }];
      }

    } catch (error) {
      logger.error('❌ Fallback pump simulation failed:', error);
      throw error;
    }
  }

  // Fallback game state retrieval when database function is not available
  private async fallbackGetGameState(): Promise<any> {
    try {
      logger.info('🔄 Using fallback game state retrieval');
      
      // Get current active round directly from rounds_cache
      const { data: roundData, error } = await this.supabase
        .from('rounds_cache')
        .select('round_id, status, pressure, pot, last1, last2, last3')
        .eq('status', 'active')
        .order('round_id', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!roundData) {
        // No active round found, return default state
        return {
          roundId: 1,
          status: 'active',
          pressure: 0,
          pot: 0,
          lastPumpers: [],
          participantCount: 0,
          riskLevel: 'LOW',
          pressurePercentage: 0
        };
      }

      // Calculate participant count from last pumpers
      const lastPumpers = [roundData.last1, roundData.last2, roundData.last3].filter(addr => addr);
      const participantCount = new Set(lastPumpers).size;

      // Calculate risk level
      const pressure = parseFloat(roundData.pressure || '0');
      let riskLevel = 'LOW';
      if (pressure > 90) riskLevel = 'EXTREME';
      else if (pressure > 70) riskLevel = 'HIGH';
      else if (pressure > 50) riskLevel = 'MEDIUM';

      // Calculate pressure percentage (assuming max pressure of 100)
      const pressurePercentage = Math.min(pressure, 100);

      return {
        roundId: roundData.round_id,
        status: roundData.status,
        pressure: pressure,
        pot: parseFloat(roundData.pot || '0'),
        lastPumpers: lastPumpers,
        participantCount: participantCount,
        riskLevel: riskLevel,
        pressurePercentage: pressurePercentage
      };

    } catch (error) {
      logger.error('❌ Fallback game state retrieval failed:', error);
      // Return default state on error
      return {
        roundId: 1,
        status: 'active',
        pressure: 0,
        pot: 0,
        lastPumpers: [],
        participantCount: 0,
        riskLevel: 'LOW',
        pressurePercentage: 0
      };
    }
  }
}

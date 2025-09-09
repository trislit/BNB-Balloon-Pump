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
      const { data: pumpResult, error } = await this.supabase
        .rpc('simulate_pump_hybrid', {
          user_address: walletAddress.toLowerCase(),
          pump_amount: pumpAmount,
          is_test: true
        });

      if (error) throw error;

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
      const { data, error } = await this.supabase
        .from('rounds_cache')
        .select('*')
        .eq('round_id', 1)
        .single();

      if (error) throw error;

      return {
        roundId: data.round_id,
        status: data.status,
        pressure: parseFloat(data.pressure || '0'),
        pot: parseFloat(data.pot || '0'),
        lastPumpers: [data.last1, data.last2, data.last3].filter(addr => addr)
      };
    } catch (error) {
      logger.error('❌ Error getting game state:', error);
      return {
        roundId: 1,
        status: 'active',
        pressure: 0,
        pot: 0,
        lastPumpers: []
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
}

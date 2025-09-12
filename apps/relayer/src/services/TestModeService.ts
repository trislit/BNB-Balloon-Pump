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
      // Check if user exists in user_balances
      let { data: user, error } = await this.supabase
        .from('user_balances')
        .select('*')
        .eq('user_address', walletAddress.toLowerCase())
        .eq('token_address', '0xTEST0000000000000000000000000000000000000')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Create user if doesn't exist
      if (!user) {
        const { data: newUser, error: createError } = await this.supabase
          .from('user_balances')
          .insert([{
            user_address: walletAddress.toLowerCase(),
            token_address: '0xTEST0000000000000000000000000000000000000',
            balance: 1000, // Starting balance
            total_deposited: 1000,
            total_withdrawn: 0,
            total_winnings: 0
          }])
          .select()
          .single();

        if (createError) throw createError;
        user = newUser;
        logger.info(`Created new user: ${walletAddress} with 1000 test tokens`);
      }

      return user;
    } catch (error) {
      logger.error('Error creating/getting user:', error);
      throw error;
    }
  }

  // Simulate deposit using simple_deposit function
  async simulateDeposit(walletAddress: string, amount: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('simple_deposit', {
          p_user_address: walletAddress.toLowerCase(),
          p_token_address: '0xTEST0000000000000000000000000000000000000',
          p_amount: parseFloat(amount)
        });

      if (error) {
        logger.error('Deposit simulation failed:', error);
        return false;
      }

      logger.info(`Deposit simulated: ${walletAddress} deposited ${amount} test tokens`);
      return true;
    } catch (error) {
      logger.error('Deposit simulation error:', error);
      return false;
    }
  }

  // Simulate withdrawal
  async simulateWithdraw(walletAddress: string, amount: string): Promise<boolean> {
    try {
      // Get current balance
      const { data: balance, error: balanceError } = await this.supabase
        .rpc('get_user_balance', {
          user_address: walletAddress.toLowerCase(),
          token_address: '0xTEST0000000000000000000000000000000000000'
        });

      if (balanceError) {
        logger.error('Error getting balance for withdrawal:', balanceError);
        return false;
      }

      const withdrawAmount = parseFloat(amount);
      if (balance.balance < withdrawAmount) {
        logger.error('Insufficient balance for withdrawal');
        return false;
      }

      // Update balance
      const { error: updateError } = await this.supabase
        .from('user_balances')
        .update({
          balance: balance.balance - withdrawAmount,
          total_withdrawn: balance.total_withdrawn + withdrawAmount
        })
        .eq('user_address', walletAddress.toLowerCase())
        .eq('token_address', '0xTEST0000000000000000000000000000000000000');

      if (updateError) {
        logger.error('Withdrawal update failed:', updateError);
        return false;
      }

      logger.info(`Withdrawal simulated: ${walletAddress} withdrew ${amount} test tokens`);
      return true;
    } catch (error) {
      logger.error('Withdrawal simulation error:', error);
      return false;
    }
  }

  // Simulate pump using direct database operations
  async simulatePump(walletAddress: string, pumpAmount: string): Promise<PumpResult> {
    try {
      // Get current game state
      const { data: gameState, error: gameError } = await this.supabase
        .rpc('get_token_game_status', { 
          token_address: '0xTEST0000000000000000000000000000000000000' 
        });

      if (gameError || !gameState || gameState.success === false) {
        logger.warn('No active game found for pump, creating new game...');
        // Create a new active game round
        await this.createNewGameRound();
        
        // Try again to get the game state
        const { data: newGameState, error: newGameError } = await this.supabase
          .rpc('get_token_game_status', { 
            token_address: '0xTEST0000000000000000000000000000000000000' 
          });

        if (newGameError || !newGameState) {
          logger.error('Error getting game state after creating new round:', newGameError);
          return {
            success: false,
            requestId: 'error',
            error: 'Failed to get game state'
          };
        }

        gameState = newGameState;
      }

      // Check user balance
      const { data: balance, error: balanceError } = await this.supabase
        .rpc('get_user_balance', {
          user_address: walletAddress.toLowerCase(),
          token_address: '0xTEST0000000000000000000000000000000000000'
        });

      if (balanceError || balance.balance < parseFloat(pumpAmount)) {
        return {
          success: false,
          requestId: 'error',
          error: 'Insufficient balance'
        };
      }

      // Calculate new pressure and pot
      const currentPressure = gameState.pressure || 0;
      const currentPot = gameState.pot_amount || 0;
      const newPressure = currentPressure + parseFloat(pumpAmount);
      const newPot = currentPot + parseFloat(pumpAmount);

      // Calculate pop chance
      let popChance = 5; // Base 5% chance
      if (newPressure > 1000) {
        popChance = 30; // 30% chance if pressure > 1000
      }

      // Check if balloon should pop
      const shouldPop = Math.random() * 100 < popChance;

      if (shouldPop) {
        // Balloon popped! End the round
        const { error: endError } = await this.supabase
          .from('game_rounds')
          .update({
            status: 'ended',
            pressure: newPressure,
            pot_amount: newPot,
            winner_address: walletAddress.toLowerCase(),
            ended_at: new Date().toISOString()
          })
          .eq('token_address', '0xTEST0000000000000000000000000000000000000')
          .eq('status', 'active');

        if (endError) {
          logger.error('Error ending round:', endError);
        }

        // Award winnings (80% to winner)
        const winnings = newPot * 0.8;
        const { error: winningsError } = await this.supabase
          .from('user_balances')
          .update({
            balance: balance.balance - parseFloat(pumpAmount) + winnings,
            total_winnings: balance.total_winnings + winnings
          })
          .eq('user_address', walletAddress.toLowerCase())
          .eq('token_address', '0xTEST0000000000000000000000000000000000000');

        if (winningsError) {
          logger.error('Error awarding winnings:', winningsError);
        }

        // Create new round
        const { error: newRoundError } = await this.supabase
          .from('game_rounds')
          .insert({
            token_address: '0xTEST0000000000000000000000000000000000000',
            round_number: (gameState.round_number || 0) + 1,
            status: 'active',
            pressure: 0,
            pot_amount: 0,
            created_at: new Date().toISOString(),
            pop_chance: 500
          });

        if (newRoundError) {
          logger.error('Error creating new round:', newRoundError);
        }

        logger.info(`Balloon popped! Winner: ${walletAddress}, Winnings: ${winnings}`);

        return {
          success: true,
          requestId: `pump_${Date.now()}`,
          balloon_popped: true,
          pressure: newPressure,
          pot: newPot,
          winner: walletAddress,
          winner_payout: winnings,
          pop_chance: popChance
        };
      } else {
        // Normal pump - update round
        const { error: updateError } = await this.supabase
          .from('game_rounds')
          .update({
            pressure: newPressure,
            pot_amount: newPot,
            winner_address: walletAddress.toLowerCase(),
            second_address: gameState.winner_address,
            third_address: gameState.second_address
          })
          .eq('token_address', '0xTEST0000000000000000000000000000000000000')
          .eq('status', 'active');

        if (updateError) {
          logger.error('Error updating round:', updateError);
        }

        // Deduct pump amount from user balance
        const { error: balanceUpdateError } = await this.supabase
          .from('user_balances')
          .update({
            balance: balance.balance - parseFloat(pumpAmount)
          })
          .eq('user_address', walletAddress.toLowerCase())
          .eq('token_address', '0xTEST0000000000000000000000000000000000000');

        if (balanceUpdateError) {
          logger.error('Error updating balance:', balanceUpdateError);
        }

        logger.info(`Pump simulated: ${walletAddress} pumped ${pumpAmount}, new pressure: ${newPressure}`);

        return {
          success: true,
          requestId: `pump_${Date.now()}`,
          balloon_popped: false,
          pressure: newPressure,
          pot: newPot,
          last_pumper: walletAddress,
          pop_chance: popChance
        };
      }
    } catch (error) {
      logger.error('Pump simulation error:', error);
      return {
        success: false,
        requestId: 'error',
        error: error.message
      };
    }
  }

  // Get user balance
  async getUserBalance(walletAddress: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_balance', {
          user_address: walletAddress.toLowerCase(),
          token_address: '0xTEST0000000000000000000000000000000000000'
        });

      if (error) {
        logger.error('Error getting user balance:', error);
        return '0';
      }

      return data.balance.toString();
    } catch (error) {
      logger.error('Get balance error:', error);
      return '0';
    }
  }

  // Get game state
  async getGameState(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_token_game_status', { 
          token_address: '0xTEST0000000000000000000000000000000000000' 
        });

      if (error || !data || data.success === false) {
        logger.warn('No active game found, creating new game...');
        // Create a new active game round
        await this.createNewGameRound();
        
        // Try again to get the game state
        const { data: newData, error: newError } = await this.supabase
          .rpc('get_token_game_status', { 
            token_address: '0xTEST0000000000000000000000000000000000000' 
          });

        if (newError || !newData) {
          logger.error('Error getting game state after creating new round:', newError);
          return this.fallbackGetGameState();
        }

        data = newData;
      }

      // Calculate risk level and pressure percentage
      const pressure = data.pressure || 0;
      const pressurePercentage = Math.min((pressure / 1000) * 100, 200); // Cap at 200%
      
      let riskLevel = 'LOW';
      if (pressurePercentage >= 200) riskLevel = 'EXTREME';
      else if (pressurePercentage >= 150) riskLevel = 'VERY HIGH';
      else if (pressurePercentage >= 120) riskLevel = 'HIGH';
      else if (pressurePercentage >= 80) riskLevel = 'MEDIUM';

      return {
        roundId: data.round_number || 1,
        currentPressure: pressure,
        pressure: pressure, // For compatibility
        maxPressure: 1000,
        potAmount: data.pot_amount?.toString() || '0',
        pot: data.pot_amount?.toString() || '0', // For compatibility
        participantCount: data.total_pumps || 0,
        lastPumpedBy: data.winner_address,
        status: data.status,
        lastPumpers: [data.winner_address, data.second_address, data.third_address].filter(Boolean),
        riskLevel,
        pressurePercentage
      };
    } catch (error) {
      logger.error('Get game state error:', error);
      return this.fallbackGetGameState();
    }
  }

  // Create a new game round
  private async createNewGameRound(): Promise<void> {
    try {
      // Get the highest round number for this token
      const { data: maxRound, error: maxError } = await this.supabase
        .from('game_rounds')
        .select('round_number')
        .eq('token_address', '0xTEST0000000000000000000000000000000000000')
        .order('round_number', { ascending: false })
        .limit(1);

      const nextRoundNumber = maxRound && maxRound.length > 0 ? maxRound[0].round_number + 1 : 1;

      // Create new active round
      const { error: createError } = await this.supabase
        .from('game_rounds')
        .insert({
          token_address: '0xTEST0000000000000000000000000000000000000',
          round_number: nextRoundNumber,
          status: 'active',
          pressure: 0,
          pot_amount: 0,
          pop_chance: 500, // 5% base chance
          created_at: new Date().toISOString()
        });

      if (createError) {
        logger.error('Error creating new game round:', createError);
      } else {
        logger.info(`Created new game round: ${nextRoundNumber}`);
      }
    } catch (error) {
      logger.error('Error in createNewGameRound:', error);
    }
  }

  // Fallback game state
  private fallbackGetGameState(): any {
    return {
      roundId: 1,
      currentPressure: 0,
      pressure: 0,
      maxPressure: 1000,
      potAmount: '0',
      pot: '0',
      participantCount: 0,
      lastPumpedBy: null,
      status: 'active',
      lastPumpers: [],
      riskLevel: 'LOW',
      pressurePercentage: 0
    };
  }

  // Get leaderboard
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_balances')
        .select('user_address, balance, total_winnings, total_deposited')
        .eq('token_address', '0xTEST0000000000000000000000000000000000000')
        .order('total_winnings', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error getting leaderboard:', error);
        return [];
      }

      return data.map((entry, index) => ({
        rank: index + 1,
        user_id: entry.user_address,
        total_winnings: entry.total_winnings?.toString() || '0',
        total_deposited: entry.total_deposited?.toString() || '0',
        balance: entry.balance?.toString() || '0'
      }));
    } catch (error) {
      logger.error('Get leaderboard error:', error);
      return [];
    }
  }
}
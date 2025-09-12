#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Simulate the exact same configuration as the relayer
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulate the TestModeService.simulatePump method exactly
async function simulatePump(walletAddress, pumpAmount) {
  try {
    console.log(`🎈 Simulating pump for ${walletAddress}, amount: ${pumpAmount}`);

    // Get current game state
    const { data: gameState, error: gameError } = await supabase
      .rpc('get_token_game_status', { 
        token_address: '0xTEST0000000000000000000000000000000000000' 
      });

    if (gameError || !gameState || gameState.success === false) {
      console.log('❌ No active game found for pump, creating new game...');
      console.log(`   Game error: ${gameError?.message}`);
      console.log(`   Game state: ${JSON.stringify(gameState)}`);
      
      // This is where the relayer fails
      return {
        success: false,
        requestId: 'error',
        error: 'No active game found'
      };
    }

    console.log('✅ Active game found:', JSON.stringify(gameState, null, 2));

    // Check user balance
    const { data: balance, error: balanceError } = await supabase
      .rpc('get_user_balance', {
        user_address: walletAddress.toLowerCase(),
        token_address: '0xTEST0000000000000000000000000000000000000'
      });

    if (balanceError || balance.balance < parseFloat(pumpAmount)) {
      console.log('❌ Insufficient balance');
      return {
        success: false,
        requestId: 'error',
        error: 'Insufficient balance'
      };
    }

    console.log('✅ Sufficient balance:', balance.balance);

    // Calculate new pressure and pot
    const currentPressure = gameState.pressure || 0;
    const currentPot = gameState.pot_amount || 0;
    const newPressure = currentPressure + parseFloat(pumpAmount);
    const newPot = currentPot + parseFloat(pumpAmount);

    console.log(`📊 Pressure: ${currentPressure} → ${newPressure}`);
    console.log(`💰 Pot: ${currentPot} → ${newPot}`);

    // Use the pump_balloon function
    const { data: pumpResult, error: pumpError } = await supabase
      .rpc('pump_balloon', {
        user_address: walletAddress,
        token_address: '0xTEST0000000000000000000000000000000000000',
        pump_amount: pumpAmount
      });

    if (pumpError) {
      console.log('❌ Pump function error:', pumpError.message);
      return {
        success: false,
        requestId: 'error',
        error: pumpError.message
      };
    }

    console.log('✅ Pump successful:', JSON.stringify(pumpResult, null, 2));

    return {
      success: true,
      requestId: `pump_${Date.now()}`,
      balloon_popped: pumpResult.balloon_popped || false,
      pressure: pumpResult.pressure,
      pot: pumpResult.pot,
      last_pumper: pumpResult.last_pumper
    };

  } catch (error) {
    console.log('❌ Simulate pump error:', error.message);
    return {
      success: false,
      requestId: 'error',
      error: error.message
    };
  }
}

async function testRelayerSimulation() {
  console.log('🔍 Testing Relayer Simulation...\n');

  try {
    const testUser = '0x1111111111111111111111111111111111111111';
    const testAmount = '100';

    // Test the simulatePump function
    const result = await simulatePump(testUser, testAmount);
    
    console.log('\n📋 Final Result:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRelayerSimulation();

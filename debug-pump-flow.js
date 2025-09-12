#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the relayer
const supabaseUrl = 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPumpFlow() {
  console.log('🔍 Debugging Pump Flow...\n');

  try {
    const testUser = '0x1111111111111111111111111111111111111111';
    const testToken = '0xTEST0000000000000000000000000000000000000';

    // 1. Check current game state
    console.log('1️⃣ Current game state:');
    const { data: gameState, error: gameError } = await supabase
      .rpc('get_token_game_status', { token_address: testToken });

    if (gameError) {
      console.log(`   ❌ Game state error: ${gameError.message}`);
    } else {
      console.log(`   ✅ Game state:`, JSON.stringify(gameState, null, 2));
    }

    // 2. Check current user balance
    console.log('\n2️⃣ Current user balance:');
    const { data: balanceData, error: balanceError } = await supabase
      .rpc('get_user_balance', {
        user_address: testUser,
        token_address: testToken
      });

    if (balanceError) {
      console.log(`   ❌ Balance error: ${balanceError.message}`);
    } else {
      console.log(`   ✅ User balance: ${balanceData.balance}`);
    }

    // 3. Check what's in the game_rounds table
    console.log('\n3️⃣ Game rounds table:');
    const { data: roundsData, error: roundsError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('token_address', testToken)
      .order('created_at', { ascending: false })
      .limit(3);

    if (roundsError) {
      console.log(`   ❌ Rounds error: ${roundsError.message}`);
    } else {
      console.log(`   ✅ Rounds data:`, JSON.stringify(roundsData, null, 2));
    }

    // 4. Simulate a pump by updating the round directly
    console.log('\n4️⃣ Simulating pump update...');
    
    if (roundsData && roundsData.length > 0) {
      const currentRound = roundsData[0];
      const newPressure = (currentRound.pressure || 0) + 100;
      const newPot = (currentRound.pot_amount || 0) + 100;

      const { error: updateError } = await supabase
        .from('game_rounds')
        .update({
          pressure: newPressure,
          pot_amount: newPot,
          winner_address: testUser,
          second_address: currentRound.winner_address,
          third_address: currentRound.second_address
        })
        .eq('id', currentRound.id);

      if (updateError) {
        console.log(`   ❌ Update error: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated round: Pressure ${newPressure}, Pot ${newPot}`);
      }

      // 5. Check game state after update
      console.log('\n5️⃣ Game state after update:');
      const { data: newGameState, error: newGameError } = await supabase
        .rpc('get_token_game_status', { token_address: testToken });

      if (newGameError) {
        console.log(`   ❌ New game state error: ${newGameError.message}`);
      } else {
        console.log(`   ✅ New game state:`, JSON.stringify(newGameState, null, 2));
      }

      // 6. Check rounds table after update
      console.log('\n6️⃣ Rounds table after update:');
      const { data: newRoundsData, error: newRoundsError } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('token_address', testToken)
        .order('created_at', { ascending: false })
        .limit(1);

      if (newRoundsError) {
        console.log(`   ❌ New rounds error: ${newRoundsError.message}`);
      } else {
        console.log(`   ✅ New rounds data:`, JSON.stringify(newRoundsData, null, 2));
      }
    }

    // 7. Test the TestModeService simulatePump function directly
    console.log('\n7️⃣ Testing TestModeService simulatePump...');
    
    // This simulates what the relayer would do
    const { data: pumpResult, error: pumpError } = await supabase
      .rpc('pump_balloon', {
        user_address: testUser,
        token_address: testToken,
        pump_amount: 50
      });

    if (pumpError) {
      console.log(`   ❌ Pump error: ${pumpError.message}`);
    } else {
      console.log(`   ✅ Pump result:`, JSON.stringify(pumpResult, null, 2));
    }

    // 8. Check final game state
    console.log('\n8️⃣ Final game state:');
    const { data: finalGameState, error: finalGameError } = await supabase
      .rpc('get_token_game_status', { token_address: testToken });

    if (finalGameError) {
      console.log(`   ❌ Final game state error: ${finalGameError.message}`);
    } else {
      console.log(`   ✅ Final game state:`, JSON.stringify(finalGameState, null, 2));
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPumpFlow();

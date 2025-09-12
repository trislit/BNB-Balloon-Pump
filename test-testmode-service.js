#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the relayer
const supabaseUrl = 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTestModeService() {
  console.log('🔍 Testing TestModeService Logic...\n');

  try {
    const testUser = '0x1111111111111111111111111111111111111111';
    const testToken = '0xTEST0000000000000000000000000000000000000';

    // 1. Test get_token_game_status (what TestModeService calls)
    console.log('1️⃣ Testing get_token_game_status...');
    const { data: gameState, error: gameError } = await supabase
      .rpc('get_token_game_status', { 
        token_address: testToken 
      });

    if (gameError) {
      console.log(`   ❌ Game state error: ${gameError.message}`);
    } else {
      console.log(`   ✅ Game state:`, JSON.stringify(gameState, null, 2));
    }

    // 2. Test get_user_balance (what TestModeService calls)
    console.log('\n2️⃣ Testing get_user_balance...');
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

    // 3. Test the exact logic from TestModeService.simulatePump
    console.log('\n3️⃣ Testing TestModeService.simulatePump logic...');
    
    // Check if game state exists
    if (gameError || !gameState || gameState.success === false) {
      console.log(`   ❌ No active game found - this is why pumps are failing!`);
      console.log(`   Game error: ${gameError?.message}`);
      console.log(`   Game state: ${JSON.stringify(gameState)}`);
    } else {
      console.log(`   ✅ Active game found - pumps should work`);
      
      // Check user balance
      if (balanceError || balanceData.balance < 100) {
        console.log(`   ❌ Insufficient balance - this would cause pump failure`);
      } else {
        console.log(`   ✅ Sufficient balance - pump should work`);
        
        // Test the actual pump logic
        console.log('\n4️⃣ Testing actual pump logic...');
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
      }
    }

    // 5. Check what's in the game_rounds table
    console.log('\n5️⃣ Checking game_rounds table...');
    const { data: roundsData, error: roundsError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('token_address', testToken)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (roundsError) {
      console.log(`   ❌ Rounds error: ${roundsError.message}`);
    } else {
      console.log(`   ✅ Active rounds:`, JSON.stringify(roundsData, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTestModeService();

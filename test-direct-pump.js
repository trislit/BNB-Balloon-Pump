#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as the relayer
const supabaseUrl = 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectPump() {
  console.log('🔍 Testing Direct Pump Function...\n');

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

    // 2. Test pump_balloon function directly
    console.log('\n2️⃣ Testing pump_balloon function directly...');
    const { data: pumpResult, error: pumpError } = await supabase
      .rpc('pump_balloon', {
        user_address: testUser,
        token_address: testToken,
        pump_amount: 100
      });

    if (pumpError) {
      console.log(`   ❌ Pump error: ${pumpError.message}`);
      console.log(`   Code: ${pumpError.code}`);
      console.log(`   Details: ${pumpError.details}`);
      console.log(`   Hint: ${pumpError.hint}`);
    } else {
      console.log(`   ✅ Pump result:`, JSON.stringify(pumpResult, null, 2));
    }

    // 3. Check game state after pump
    console.log('\n3️⃣ Game state after pump:');
    const { data: newGameState, error: newGameError } = await supabase
      .rpc('get_token_game_status', { token_address: testToken });

    if (newGameError) {
      console.log(`   ❌ New game state error: ${newGameError.message}`);
    } else {
      console.log(`   ✅ New game state:`, JSON.stringify(newGameState, null, 2));
    }

    // 4. Check user balance after pump
    console.log('\n4️⃣ User balance after pump:');
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

    // 5. Check what's in the pumps table
    console.log('\n5️⃣ Pumps table:');
    const { data: pumpsData, error: pumpsError } = await supabase
      .from('pumps')
      .select('*')
      .eq('user_id', testUser)
      .order('requested_at', { ascending: false })
      .limit(5);

    if (pumpsError) {
      console.log(`   ❌ Pumps error: ${pumpsError.message}`);
    } else {
      console.log(`   ✅ Pumps data:`, JSON.stringify(pumpsData, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectPump();

#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTestFunctions() {
  console.log('🔍 Debugging Test Functions\n');

  try {
    // Test 1: Check if deposit_tokens function exists and works
    console.log('1️⃣ Testing deposit_tokens function...');
    const { data: depositResult, error: depositError } = await supabase
      .rpc('deposit_tokens', {
        user_address: '0x1111111111111111111111111111111111111111',
        token_address: '0xTEST0000000000000000000000000000000000000',
        amount: 1000
      });

    if (depositError) {
      console.log(`   ❌ Deposit error: ${depositError.message}`);
      console.log(`   Code: ${depositError.code}`);
      console.log(`   Details: ${depositError.details}`);
    } else {
      console.log(`   ✅ Deposit success: ${JSON.stringify(depositResult, null, 2)}`);
    }

    // Test 2: Check if pump_balloon function exists and works
    console.log('\n2️⃣ Testing pump_balloon function...');
    const { data: pumpResult, error: pumpError } = await supabase
      .rpc('pump_balloon', {
        user_address: '0x1111111111111111111111111111111111111111',
        token_address: '0xTEST0000000000000000000000000000000000000',
        pump_amount: 100
      });

    if (pumpError) {
      console.log(`   ❌ Pump error: ${pumpError.message}`);
      console.log(`   Code: ${pumpError.code}`);
      console.log(`   Details: ${pumpError.details}`);
    } else {
      console.log(`   ✅ Pump success: ${JSON.stringify(pumpResult, null, 2)}`);
    }

    // Test 3: Check if get_user_balance function exists and works
    console.log('\n3️⃣ Testing get_user_balance function...');
    const { data: balanceResult, error: balanceError } = await supabase
      .rpc('get_user_balance', {
        user_address: '0x1111111111111111111111111111111111111111',
        token_address: '0xTEST0000000000000000000000000000000000000'
      });

    if (balanceError) {
      console.log(`   ❌ Balance error: ${balanceError.message}`);
      console.log(`   Code: ${balanceError.code}`);
      console.log(`   Details: ${balanceError.details}`);
    } else {
      console.log(`   ✅ Balance success: ${JSON.stringify(balanceResult, null, 2)}`);
    }

    // Test 4: Check what functions actually exist
    console.log('\n4️⃣ Checking what functions exist...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT routine_name, routine_type 
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name IN ('deposit_tokens', 'pump_balloon', 'get_user_balance', 'get_token_game_status', 'get_historical_games')
          ORDER BY routine_name;
        `
      });

    if (functionsError) {
      console.log(`   ❌ Functions query error: ${functionsError.message}`);
    } else {
      console.log(`   ✅ Available functions: ${JSON.stringify(functions, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugTestFunctions();

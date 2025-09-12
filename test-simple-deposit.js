#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleDeposit() {
  console.log('🧪 Testing simple deposit function...\n');

  try {
    // Test the simple function
    const { data: result, error } = await supabase
      .rpc('simple_deposit', {
        p_user_address: '0x1111111111111111111111111111111111111111',
        p_token_address: '0xTEST0000000000000000000000000000000000000',
        p_amount: 1000
      });

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
    } else {
      console.log(`✅ Success: ${JSON.stringify(result, null, 2)}`);
    }

    // Check the balance
    console.log('\n🔍 Checking balance...');
    const { data: balance, error: balanceError } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_address', '0x1111111111111111111111111111111111111111')
      .eq('token_address', '0xTEST0000000000000000000000000000000000000');

    if (balanceError) {
      console.log(`❌ Balance error: ${balanceError.message}`);
    } else {
      console.log(`✅ Balance: ${JSON.stringify(balance, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleDeposit();

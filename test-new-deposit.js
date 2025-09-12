#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNewDeposit() {
  console.log('🧪 Testing new deposit function...\n');

  try {
    // Test the new function
    const { data: result, error } = await supabase
      .rpc('deposit_tokens_v2', {
        user_address: '0x1111111111111111111111111111111111111111',
        token_address: '0xTEST0000000000000000000000000000000000000',
        amount: 1000
      });

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
    } else {
      console.log(`✅ Success: ${JSON.stringify(result, null, 2)}`);
    }

    // Test the old function
    console.log('\n🔍 Testing old deposit function...');
    const { data: oldResult, error: oldError } = await supabase
      .rpc('deposit_tokens', {
        user_address: '0x2222222222222222222222222222222222222222',
        token_address: '0xTEST0000000000000000000000000000000000000',
        amount: 2000
      });

    if (oldError) {
      console.log(`❌ Old function error: ${oldError.message}`);
    } else {
      console.log(`✅ Old function success: ${JSON.stringify(oldResult, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewDeposit();

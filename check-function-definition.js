#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunctionDefinition() {
  console.log('🔍 Checking current function definition...\n');

  try {
    // Try to get the function definition using a direct query
    const { data, error } = await supabase
      .from('information_schema.routines')
      .select('routine_definition')
      .eq('routine_name', 'deposit_tokens')
      .eq('routine_schema', 'public');

    if (error) {
      console.log(`❌ Error querying function: ${error.message}`);
    } else {
      console.log(`✅ Function definition found: ${JSON.stringify(data, null, 2)}`);
    }

    // Try a different approach - check if the function exists
    const { data: exists, error: existsError } = await supabase
      .rpc('deposit_tokens', {
        user_address: '0x1111111111111111111111111111111111111111',
        token_address: '0xTEST0000000000000000000000000000000000000',
        amount: 1
      });

    if (existsError) {
      console.log(`❌ Function error: ${existsError.message}`);
      console.log(`   Code: ${existsError.code}`);
      console.log(`   Details: ${existsError.details}`);
      console.log(`   Hint: ${existsError.hint}`);
    } else {
      console.log(`✅ Function works: ${JSON.stringify(exists, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkFunctionDefinition();

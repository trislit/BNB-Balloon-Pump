#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Checking user_balances table structure...\n');

  try {
    // Try to select from the table to see its structure
    const { data, error } = await supabase
      .from('user_balances')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ Error querying table: ${error.message}`);
      console.log(`   Code: ${error.code}`);
      console.log(`   Details: ${error.details}`);
    } else {
      console.log(`✅ Table structure: ${JSON.stringify(data, null, 2)}`);
    }

    // Try to insert a simple record
    console.log('\n🧪 Testing simple insert...');
    const { data: insertData, error: insertError } = await supabase
      .from('user_balances')
      .insert({
        user_address: '0x9999999999999999999999999999999999999999',
        token_address: '0xTEST0000000000000000000000000000000000000',
        balance: 1000,
        total_deposited: 1000
      })
      .select();

    if (insertError) {
      console.log(`❌ Insert error: ${insertError.message}`);
      console.log(`   Code: ${insertError.code}`);
      console.log(`   Details: ${insertError.details}`);
    } else {
      console.log(`✅ Insert success: ${JSON.stringify(insertData, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkTableStructure();

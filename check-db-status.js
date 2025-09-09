#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Use environment variables or defaults
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...\n');

  try {
    // Check if tables exist
    const tables = ['profiles', 'rounds_cache', 'token_transactions', 'leaderboard'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`);
        } else {
          console.log(`✅ Table '${table}': OK`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`);
      }
    }

    // Check if initial round exists
    console.log('\n🎮 Checking game state...');
    const { data: roundData, error: roundError } = await supabase
      .from('rounds_cache')
      .select('*')
      .eq('round_id', 1)
      .single();

    if (roundError) {
      console.log(`❌ No initial round found: ${roundError.message}`);
    } else {
      console.log(`✅ Initial round found:`, roundData);
    }

    // Check if functions exist
    console.log('\n🔧 Checking database functions...');
    const { data: funcData, error: funcError } = await supabase
      .rpc('simulate_pump_hybrid', {
        user_address: '0x0000000000000000000000000000000000000000',
        pump_amount: '0',
        is_test: true
      });

    if (funcError) {
      console.log(`❌ Function 'simulate_pump_hybrid': ${funcError.message}`);
    } else {
      console.log(`✅ Function 'simulate_pump_hybrid': OK`);
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabaseStatus();

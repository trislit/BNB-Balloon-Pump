#!/usr/bin/env node

/**
 * Debug: Round Reset Issue
 * Check what's happening with automatic round creation
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRoundReset() {
  console.log('🔍 Debug: Round Reset Issue\n');

  try {
    // 1. Check current rounds
    console.log('1️⃣ Checking current rounds...');
    const { data: rounds, error: roundsError } = await supabase
      .from('rounds_cache')
      .select('*')
      .order('updated_at', { ascending: false });

    if (roundsError) throw roundsError;

    console.log(`   Found ${rounds.length} rounds:`);
    rounds.forEach(round => {
      console.log(`   - Round ${round.round_id}: ${round.status}, Pressure: ${round.pressure}, Pot: ${round.pot}`);
    });

    // 2. Check if simulate_pump_hybrid function exists
    console.log('\n2️⃣ Testing simulate_pump_hybrid function...');
    try {
      const { data: testResult, error: testError } = await supabase
        .rpc('simulate_pump_hybrid', {
          user_address: '0x1111111111111111111111111111111111111111',
          pump_amount: '100',
          is_test: true
        });

      if (testError) {
        console.log(`   ❌ Function error: ${testError.message}`);
        console.log(`   Code: ${testError.code}`);
        console.log(`   Details: ${testError.details}`);
        console.log(`   Hint: ${testError.hint}`);
      } else {
        console.log(`   ✅ Function works: ${JSON.stringify(testResult, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Function doesn't exist or has issues: ${error.message}`);
    }

    // 3. Check if manual_pump function exists
    console.log('\n3️⃣ Testing manual_pump function...');
    try {
      const { data: pumpResult, error: pumpError } = await supabase
        .rpc('manual_pump', {
          user_address: '0x1111111111111111111111111111111111111111',
          pump_amount: '100'
        });

      if (pumpError) {
        console.log(`   ❌ Function error: ${pumpError.message}`);
      } else {
        console.log(`   ✅ Function works: ${JSON.stringify(pumpResult, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Function doesn't exist: ${error.message}`);
    }

    // 4. Check database schema
    console.log('\n4️⃣ Checking database schema...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['rounds_cache', 'payout_distributions', 'profiles']);

    if (tablesError) {
      console.log(`   ❌ Schema check error: ${tablesError.message}`);
    } else {
      console.log(`   ✅ Found tables: ${tables.map(t => t.table_name).join(', ')}`);
    }

    // 5. Check if we have test users
    console.log('\n5️⃣ Checking test users...');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('evm_address, test_tokens')
      .limit(5);

    if (usersError) {
      console.log(`   ❌ Users check error: ${usersError.message}`);
    } else {
      console.log(`   ✅ Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`   - ${user.evm_address}: ${user.test_tokens} tokens`);
      });
    }

    // 6. Try a simple pump to see what happens
    console.log('\n6️⃣ Testing a simple pump...');
    if (users && users.length > 0) {
      const testUser = users[0].evm_address;
      console.log(`   Testing with user: ${testUser}`);
      
      try {
        const { data: pumpResult, error: pumpError } = await supabase
          .rpc('simulate_pump_hybrid', {
            user_address: testUser,
            pump_amount: '100',
            is_test: true
          });

        if (pumpError) {
          console.log(`   ❌ Pump failed: ${pumpError.message}`);
        } else {
          console.log(`   ✅ Pump result: ${JSON.stringify(pumpResult, null, 2)}`);
          
          // Check if round was created/updated
          const { data: updatedRounds, error: updatedError } = await supabase
            .from('rounds_cache')
            .select('*')
            .order('updated_at', { ascending: false });

          if (!updatedError && updatedRounds) {
            console.log(`   📊 Rounds after pump: ${updatedRounds.length}`);
            updatedRounds.forEach(round => {
              console.log(`   - Round ${round.round_id}: ${round.status}, Pressure: ${round.pressure}`);
            });
          }
        }
      } catch (error) {
        console.log(`   ❌ Pump test failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugRoundReset().catch(console.error);

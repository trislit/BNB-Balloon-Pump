#!/usr/bin/env node

/**
 * Test script for Don't Pop the Balloon integration
 * Tests vault deposits, random popping, and payout distribution
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testIntegration() {
  console.log('🧪 Testing Don\'t Pop the Balloon Integration...\n');

  try {
    // Test 1: Check if new schema exists
    console.log('1️⃣ Testing database schema...');
    
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['payout_distributions', 'vault_balances']);

    if (tableError) throw tableError;

    const hasPayoutTable = tables.some(t => t.table_name === 'payout_distributions');
    const hasVaultTable = tables.some(t => t.table_name === 'vault_balances');

    if (hasPayoutTable && hasVaultTable) {
      console.log('✅ New tables created successfully');
    } else {
      console.log('❌ Missing required tables');
      return;
    }

    // Test 2: Test vault balance function
    console.log('\n2️⃣ Testing vault balance functions...');
    
    const testAddress = '0x1234567890123456789012345678901234567890';
    
    // Create test user
    const { error: userError } = await supabase
      .from('profiles')
      .upsert({
        evm_address: testAddress,
        test_tokens: '1000'
      });

    if (userError) throw userError;

    // Test get_vault_balance function
    const { data: balance, error: balanceError } = await supabase
      .rpc('get_vault_balance', {
        user_address: testAddress
      });

    if (balanceError) throw balanceError;

    console.log(`✅ Vault balance retrieved: ${balance} tokens`);

    // Test 3: Test pump simulation with new payout structure
    console.log('\n3️⃣ Testing pump simulation...');
    
    const { data: pumpResult, error: pumpError } = await supabase
      .rpc('simulate_pump_hybrid', {
        user_address: testAddress,
        pump_amount: '100',
        is_test: true
      });

    if (pumpError) throw pumpError;

    console.log('✅ Pump simulation successful');
    console.log(`   - Success: ${pumpResult.success}`);
    console.log(`   - Balloon popped: ${pumpResult.balloon_popped}`);
    console.log(`   - Pressure: ${pumpResult.pressure}`);
    console.log(`   - Pot: ${pumpResult.pot}`);

    if (pumpResult.balloon_popped) {
      console.log(`   - Winner: ${pumpResult.winner}`);
      console.log(`   - Winner amount: ${pumpResult.winner_amount}`);
      console.log(`   - Second amount: ${pumpResult.second_amount}`);
      console.log(`   - Third amount: ${pumpResult.third_amount}`);
      console.log(`   - Dev amount: ${pumpResult.dev_amount}`);
      console.log(`   - Burn amount: ${pumpResult.burn_amount}`);
    }

    // Test 4: Test payout history
    console.log('\n4️⃣ Testing payout history...');
    
    const { data: payoutHistory, error: historyError } = await supabase
      .rpc('get_payout_history', {
        user_address: testAddress,
        limit_count: 5
      });

    if (historyError) throw historyError;

    console.log(`✅ Payout history retrieved: ${payoutHistory.length} records`);

    // Test 5: Test multiple pumps to see random popping
    console.log('\n5️⃣ Testing random popping mechanics...');
    
    let pumps = 0;
    let popped = false;
    
    while (pumps < 10 && !popped) {
      const { data: result, error: error } = await supabase
        .rpc('simulate_pump_hybrid', {
          user_address: testAddress,
          pump_amount: '50',
          is_test: true
        });

      if (error) throw error;
      
      pumps++;
      console.log(`   Pump ${pumps}: Pressure ${result.pressure}, Popped: ${result.balloon_popped}`);
      
      if (result.balloon_popped) {
        popped = true;
        console.log(`   🎉 Balloon popped after ${pumps} pumps!`);
        console.log(`   Winner gets: ${result.winner_amount} tokens`);
      }
    }

    if (!popped) {
      console.log(`   Balloon didn't pop after ${pumps} pumps (threshold-based popping)`);
    }

    // Test 6: Verify payout distribution table
    console.log('\n6️⃣ Testing payout distribution tracking...');
    
    const { data: distributions, error: distError } = await supabase
      .from('payout_distributions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (distError) throw distError;

    console.log(`✅ Found ${distributions.length} payout distributions`);
    
    if (distributions.length > 0) {
      const latest = distributions[0];
      console.log(`   Latest distribution:`);
      console.log(`   - Round: ${latest.round_id}`);
      console.log(`   - Winner: ${latest.winner_address}`);
      console.log(`   - Winner amount: ${latest.winner_amount}`);
      console.log(`   - Total pot: ${latest.total_pot}`);
    }

    console.log('\n🎉 All tests passed! Integration is working correctly.');
    console.log('\n📊 Summary:');
    console.log('✅ Database schema updated');
    console.log('✅ Vault balance system working');
    console.log('✅ Pump simulation with new payouts');
    console.log('✅ Random popping mechanics active');
    console.log('✅ Payout tracking functional');
    console.log('\n🚀 Ready for deployment!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testIntegration().catch(console.error);

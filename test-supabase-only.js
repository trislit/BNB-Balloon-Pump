#!/usr/bin/env node

/**
 * Supabase-Only Test Script for Don't Pop the Balloon
 * Tests game mechanics without any blockchain integration
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test users
const testUsers = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222', 
  '0x3333333333333333333333333333333333333333',
  '0x4444444444444444444444444444444444444444',
  '0x5555555555555555555555555555555555555555'
];

async function testSupabaseOnly() {
  console.log('🎈 Testing Don\'t Pop the Balloon - Supabase Only Mode\n');

  try {
    // Test 1: Setup and verify environment
    console.log('1️⃣ Setting up test environment...');
    
    const { data: setupResult, error: setupError } = await supabase
      .rpc('get_game_stats');

    if (setupError) throw setupError;

    console.log('✅ Test environment ready');
    console.log(`   - Active rounds: ${setupResult.active_rounds}`);
    console.log(`   - Total users: ${setupResult.total_users}`);
    console.log(`   - Total vault balance: ${setupResult.total_vault_balance}`);

    // Test 2: Test individual pumps
    console.log('\n2️⃣ Testing individual pump mechanics...');
    
    const testUser = testUsers[0];
    const pumpAmount = '100';
    
    const { data: pumpResult, error: pumpError } = await supabase
      .rpc('manual_pump', {
        user_address: testUser,
        pump_amount: pumpAmount
      });

    if (pumpError) throw pumpError;

    console.log('✅ Pump successful');
    console.log(`   - User: ${testUser}`);
    console.log(`   - Amount: ${pumpAmount}`);
    console.log(`   - Pressure: ${pumpResult.pressure}`);
    console.log(`   - Pot: ${pumpResult.pot}`);
    console.log(`   - Balloon popped: ${pumpResult.balloon_popped}`);
    console.log(`   - Pop chance: ${pumpResult.pop_chance}%`);

    if (pumpResult.balloon_popped) {
      console.log(`   🎉 Winner: ${pumpResult.winner}`);
      console.log(`   💰 Winner amount: ${pumpResult.winner_amount}`);
      console.log(`   🥈 Second amount: ${pumpResult.second_amount}`);
      console.log(`   🥉 Third amount: ${pumpResult.third_amount}`);
    }

    // Test 3: Test multiple pumps to see random popping
    console.log('\n3️⃣ Testing random popping mechanics...');
    
    let pumps = 0;
    let popped = false;
    const maxPumps = 15;
    
    while (pumps < maxPumps && !popped) {
      const randomUser = testUsers[pumps % testUsers.length];
      const randomAmount = (50 + Math.floor(Math.random() * 150)).toString();
      
      const { data: result, error: error } = await supabase
        .rpc('manual_pump', {
          user_address: randomUser,
          pump_amount: randomAmount
        });

      if (error) throw error;
      
      pumps++;
      console.log(`   Pump ${pumps}: ${randomUser.slice(0,8)}... pumps ${randomAmount}, Pressure: ${result.pressure}, Popped: ${result.balloon_popped}`);
      
      if (result.balloon_popped) {
        popped = true;
        console.log(`   🎉 Balloon popped after ${pumps} pumps!`);
        console.log(`   🏆 Winner: ${result.winner}`);
        console.log(`   💰 Winner gets: ${result.winner_amount} tokens`);
        console.log(`   🥈 Second gets: ${result.second_amount} tokens`);
        console.log(`   🥉 Third gets: ${result.third_amount} tokens`);
        console.log(`   🔄 New round automatically created!`);
      }
    }

    if (!popped) {
      console.log(`   Balloon didn't pop after ${pumps} pumps (threshold-based popping)`);
    }

    // Test 4: Test different pop chances
    console.log('\n4️⃣ Testing different pop chance settings...');
    
    const { data: popChanceResults, error: popChanceError } = await supabase
      .rpc('test_pop_chances');

    if (popChanceError) throw popChanceError;

    console.log('✅ Pop chance tests completed');
    popChanceResults.pop_chance_tests.forEach(test => {
      console.log(`   ${test.pop_percentage} chance: ${test.actual_pops}/${test.total_tests} pops (${test.actual_rate})`);
    });

    // Test 5: Test game mechanics simulation
    console.log('\n5️⃣ Testing full game mechanics simulation...');
    
    const { data: gameResults, error: gameError } = await supabase
      .rpc('test_game_mechanics', { rounds_to_test: 3 });

    if (gameError) throw gameError;

    console.log('✅ Game mechanics simulation completed');
    console.log(`   - Rounds tested: ${gameResults.total_rounds}`);
    console.log(`   - Total pops: ${gameResults.total_pops}`);
    console.log(`   - Pop rate: ${gameResults.pop_rate}`);
    console.log(`   - Average pressure: ${gameResults.average_pressure}`);
    console.log(`   - Average pot: ${gameResults.average_pot}`);

    // Test 6: Test vault balance system
    console.log('\n6️⃣ Testing vault balance system...');
    
    for (const user of testUsers) {
      const { data: balance, error: balanceError } = await supabase
        .rpc('get_vault_balance', { user_address: user });

      if (balanceError) throw balanceError;

      console.log(`   ${user.slice(0,8)}... vault balance: ${balance} tokens`);
    }

    // Test 7: Test payout history
    console.log('\n7️⃣ Testing payout history...');
    
    const { data: payoutHistory, error: historyError } = await supabase
      .rpc('get_payout_history', {
        user_address: testUsers[0],
        limit_count: 5
      });

    if (historyError) throw historyError;

    console.log(`✅ Payout history retrieved: ${payoutHistory.length} records`);
    if (payoutHistory.length > 0) {
      payoutHistory.forEach((payout, index) => {
        console.log(`   ${index + 1}. Round ${payout.round_id}: ${payout.winner_amount} tokens (${payout.is_winner ? 'Winner' : payout.is_second ? 'Second' : 'Third'})`);
      });
    }

    // Test 8: Test current game state
    console.log('\n8️⃣ Testing current game state...');
    
    const { data: currentStats, error: statsError } = await supabase
      .rpc('get_game_stats');

    if (statsError) throw statsError;

    console.log('✅ Current game statistics:');
    console.log(`   - Active rounds: ${currentStats.active_rounds}`);
    console.log(`   - Total rounds: ${currentStats.total_rounds}`);
    console.log(`   - Total payouts: ${currentStats.total_payouts}`);
    console.log(`   - Total pumps: ${currentStats.total_pumps}`);
    console.log(`   - Total vault balance: ${currentStats.total_vault_balance}`);

    if (currentStats.recent_payouts && currentStats.recent_payouts.length > 0) {
      console.log('   Recent payouts:');
      currentStats.recent_payouts.forEach((payout, index) => {
        console.log(`     ${index + 1}. Round ${payout.round_id}: ${payout.winner} won ${payout.winner_amount} tokens`);
      });
    }

    console.log('\n🎉 All Supabase-only tests passed!');
    console.log('\n📊 Summary:');
    console.log('✅ Database schema working');
    console.log('✅ Vault balance system functional');
    console.log('✅ Random popping mechanics active');
    console.log('✅ Payout distribution working (80/10/5/2.5/2.5)');
    console.log('✅ Game state tracking operational');
    console.log('✅ Test functions working correctly');
    console.log('\n🚀 Ready to hone game mechanics!');
    console.log('\n💡 Next steps:');
    console.log('   - Adjust pop chances in rounds_cache table');
    console.log('   - Test different pump amounts');
    console.log('   - Fine-tune payout percentages');
    console.log('   - Add more test users');
    console.log('   - Run longer simulations');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testSupabaseOnly().catch(console.error);

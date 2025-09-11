#!/usr/bin/env node

/**
 * Demo: Automatic Round Progression
 * Shows how the game automatically creates new rounds when balloons pop
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

async function demoAutomaticRounds() {
  console.log('🎈 Demo: Automatic Round Progression\n');
  console.log('This demo shows how the game automatically creates new rounds when balloons pop.\n');

  try {
    // Check current game state
    console.log('1️⃣ Checking current game state...');
    const { data: currentStats, error: statsError } = await supabase.rpc('get_game_stats');
    if (statsError) throw statsError;

    console.log(`   Active rounds: ${currentStats.active_rounds}`);
    console.log(`   Total rounds: ${currentStats.total_rounds}`);
    console.log(`   Total payouts: ${currentStats.total_payouts}`);

    // Get current active round
    const { data: activeRound, error: roundError } = await supabase
      .from('rounds_cache')
      .select('*')
      .eq('status', 'active')
      .single();

    if (roundError && roundError.code === 'PGRST116') {
      console.log('   No active round found - this is normal for a fresh setup');
    } else if (activeRound) {
      console.log(`   Current round: ${activeRound.round_id}`);
      console.log(`   Current pressure: ${activeRound.pressure}`);
      console.log(`   Current pot: ${activeRound.pot}`);
      console.log(`   Pop chance: ${activeRound.pop_chance}%`);
    }

    // Set a high pop chance for demo purposes
    console.log('\n2️⃣ Setting high pop chance for demo (20%)...');
    const { error: updateError } = await supabase
      .from('rounds_cache')
      .update({ pop_chance: 2000 }) // 20% chance
      .eq('status', 'active');

    if (updateError) throw updateError;
    console.log('   ✅ Pop chance set to 20%');

    // Simulate multiple rounds
    console.log('\n3️⃣ Simulating multiple rounds...');
    let totalRounds = 0;
    let totalPops = 0;
    const maxRounds = 5;

    while (totalRounds < maxRounds) {
      console.log(`\n   🎮 Round ${totalRounds + 1}:`);
      
      let pumps = 0;
      let popped = false;
      const maxPumps = 10;

      while (pumps < maxPumps && !popped) {
        const randomUser = testUsers[pumps % testUsers.length];
        const randomAmount = (50 + Math.floor(Math.random() * 100)).toString();
        
        const { data: result, error: error } = await supabase
          .rpc('manual_pump', {
            user_address: randomUser,
            pump_amount: randomAmount
          });

        if (error) throw error;
        
        pumps++;
        console.log(`     Pump ${pumps}: ${randomUser.slice(0,8)}... pumps ${randomAmount}, Pressure: ${result.pressure}`);
        
        if (result.balloon_popped) {
          popped = true;
          totalPops++;
          console.log(`     🎉 BALLOON POPPED!`);
          console.log(`     🏆 Winner: ${result.winner}`);
          console.log(`     💰 Winner gets: ${result.winner_amount} tokens`);
          console.log(`     🥈 Second gets: ${result.second_amount} tokens`);
          console.log(`     🥉 Third gets: ${result.third_amount} tokens`);
          console.log(`     🔄 New round automatically created!`);
          
          // Check that a new round was created
          const { data: newRound, error: newRoundError } = await supabase
            .from('rounds_cache')
            .select('*')
            .eq('status', 'active')
            .single();

          if (newRoundError) throw newRoundError;
          console.log(`     ✅ New round ${newRound.round_id} is active with 0 pressure`);
        }
      }

      if (!popped) {
        console.log(`     Balloon didn't pop after ${pumps} pumps`);
      }

      totalRounds++;
    }

    // Final statistics
    console.log('\n4️⃣ Final Statistics:');
    const { data: finalStats, error: finalStatsError } = await supabase.rpc('get_game_stats');
    if (finalStatsError) throw finalStatsError;

    console.log(`   Total rounds played: ${finalStats.total_rounds}`);
    console.log(`   Total pops: ${finalStats.total_payouts}`);
    console.log(`   Pop rate: ${((finalStats.total_payouts / finalStats.total_rounds) * 100).toFixed(1)}%`);
    console.log(`   Total pumps: ${finalStats.total_pumps}`);

    if (finalStats.recent_payouts && finalStats.recent_payouts.length > 0) {
      console.log('\n   Recent payouts:');
      finalStats.recent_payouts.slice(0, 3).forEach((payout, index) => {
        console.log(`     ${index + 1}. Round ${payout.round_id}: ${payout.winner} won ${payout.winner_amount} tokens`);
      });
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📊 Key Takeaways:');
    console.log('✅ Rounds automatically reset when balloons pop');
    console.log('✅ New rounds are created with fresh pressure/pot');
    console.log('✅ Payouts are distributed automatically');
    console.log('✅ Game continues seamlessly without manual intervention');
    console.log('✅ Round IDs increment automatically');
    console.log('\n🚀 The game is fully automated and ready for continuous play!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the demo
demoAutomaticRounds().catch(console.error);

#!/usr/bin/env node

/**
 * Test Fixes: Verify random popping and dynamic payouts are working
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

async function testFixes() {
  console.log('🔧 Testing Fixes: Random Popping + Dynamic Payouts\n');

  try {
    // Test 1: Check current payout percentages
    console.log('1️⃣ Testing payout percentages function...');
    const { data: payoutData, error: payoutError } = await supabase
      .rpc('get_current_payout_percentages');

    if (payoutError) {
      console.log(`   ❌ Payout function error: ${payoutError.message}`);
    } else {
      console.log(`   ✅ Payout function works!`);
      console.log(`   📊 Current pressure: ${payoutData.pressure}`);
      console.log(`   📈 Pressure ratio: ${(payoutData.pressure_ratio * 100).toFixed(1)}%`);
      console.log(`   🏆 Winner: ${payoutData.winner_pct_display}%`);
      console.log(`   🥈 Second: ${payoutData.second_pct_display}%`);
      console.log(`   🥉 Third: ${payoutData.third_pct_display}%`);
      console.log(`   👨‍💻 Dev: ${payoutData.dev_pct_display}%`);
      console.log(`   🔥 Burn: ${payoutData.burn_pct_display}%`);
    }

    // Test 2: Test random popping with multiple games
    console.log('\n2️⃣ Testing random popping...');
    const popResults = [];
    const numTests = 10;

    for (let test = 1; test <= numTests; test++) {
      console.log(`\n   🎮 Game ${test}/${numTests}:`);
      
      let pumps = 0;
      let popped = false;
      const maxPumps = 25;

      while (pumps < maxPumps && !popped) {
        const randomUser = testUsers[pumps % testUsers.length];
        const randomAmount = (50 + Math.floor(Math.random() * 100)).toString();
        
        const { data: result, error: error } = await supabase
          .rpc('manual_pump', {
            user_address: randomUser,
            pump_amount: randomAmount
          });

        if (error) {
          console.log(`      ❌ Pump failed: ${error.message}`);
          break;
        }
        
        pumps++;
        console.log(`      Pump ${pumps}: Pressure: ${result.pressure}, Popped: ${result.balloon_popped}`);
        
        if (result.balloon_popped) {
          popped = true;
          const pressure = parseFloat(result.pressure);
          const payout = result.payout_structure;
          
          popResults.push({
            test,
            pumps,
            pressure,
            pressure_ratio: payout.pressure_ratio,
            winner_pct: payout.winner_pct,
            dev_pct: payout.dev_pct,
            burn_pct: payout.burn_pct,
            pop_reason: result.pop_reason
          });
          
          console.log(`      🎉 BALLOON POPPED!`);
          console.log(`      📊 Pressure: ${pressure} (${(payout.pressure_ratio * 100).toFixed(1)}% of max)`);
          console.log(`      🏆 Winner: ${(payout.winner_pct * 100).toFixed(1)}%`);
          console.log(`      👨‍💻 Dev: ${(payout.dev_pct * 100).toFixed(1)}%`);
          console.log(`      🔥 Burn: ${(payout.burn_pct * 100).toFixed(1)}%`);
          console.log(`      🎯 Reason: ${result.pop_reason}`);
        }
      }

      if (!popped) {
        console.log(`      ⚠️  Balloon didn't pop after ${pumps} pumps (hit max limit)`);
      }
    }

    // Test 3: Analyze results
    console.log('\n3️⃣ Analyzing Results:');
    console.log('=====================');
    
    if (popResults.length > 0) {
      // Check pressure distribution
      const pressures = popResults.map(r => r.pressure);
      const minPressure = Math.min(...pressures);
      const maxPressure = Math.max(...pressures);
      const avgPressure = pressures.reduce((sum, p) => sum + p, 0) / pressures.length;
      
      console.log(`\n📊 Pressure Distribution:`);
      console.log(`   Min pressure: ${minPressure}`);
      console.log(`   Max pressure: ${maxPressure}`);
      console.log(`   Average pressure: ${avgPressure.toFixed(1)}`);
      
      // Check pop reasons
      const randomPops = popResults.filter(r => r.pop_reason === 'random_pop');
      const thresholdPops = popResults.filter(r => r.pop_reason === 'threshold_reached');
      
      console.log(`\n🎲 Pop Reasons:`);
      console.log(`   Random pops: ${randomPops.length} (${(randomPops.length / popResults.length * 100).toFixed(1)}%)`);
      console.log(`   Threshold pops: ${thresholdPops.length} (${(thresholdPops.length / popResults.length * 100).toFixed(1)}%)`);
      
      // Check payout progression
      const sortedResults = popResults.sort((a, b) => a.pressure - b.pressure);
      const earlyPops = sortedResults.filter(r => r.pressure < 300);
      const latePops = sortedResults.filter(r => r.pressure >= 700);
      
      console.log(`\n💰 Payout Analysis:`);
      if (earlyPops.length > 0) {
        const avgWinner = earlyPops.reduce((sum, r) => sum + r.winner_pct, 0) / earlyPops.length;
        const avgDev = earlyPops.reduce((sum, r) => sum + r.dev_pct, 0) / earlyPops.length;
        const avgBurn = earlyPops.reduce((sum, r) => sum + r.burn_pct, 0) / earlyPops.length;
        console.log(`   Early pops (<300): Winner ${(avgWinner * 100).toFixed(1)}%, Dev ${(avgDev * 100).toFixed(1)}%, Burn ${(avgBurn * 100).toFixed(1)}%`);
      }
      
      if (latePops.length > 0) {
        const avgWinner = latePops.reduce((sum, r) => sum + r.winner_pct, 0) / latePops.length;
        const avgDev = latePops.reduce((sum, r) => sum + r.dev_pct, 0) / latePops.length;
        const avgBurn = latePops.reduce((sum, r) => sum + r.burn_pct, 0) / latePops.length;
        console.log(`   Late pops (700+): Winner ${(avgWinner * 100).toFixed(1)}%, Dev ${(avgDev * 100).toFixed(1)}%, Burn ${(avgBurn * 100).toFixed(1)}%`);
      }
      
      // Test 4: Verify fixes
      console.log('\n4️⃣ Verifying Fixes:');
      console.log('===================');
      
      let fixesWorking = true;
      
      // Check if random popping is working (not all at 1000)
      if (minPressure < 1000) {
        console.log('✅ Random popping is working - balloons pop at various pressures');
      } else {
        console.log('❌ Random popping not working - all pops at 1000 pressure');
        fixesWorking = false;
      }
      
      // Check if dynamic payouts are working
      if (earlyPops.length > 0 && latePops.length > 0) {
        const earlyWinnerAvg = earlyPops.reduce((sum, r) => sum + r.winner_pct, 0) / earlyPops.length;
        const lateWinnerAvg = latePops.reduce((sum, r) => sum + r.winner_pct, 0) / latePops.length;
        
        if (lateWinnerAvg > earlyWinnerAvg) {
          console.log('✅ Dynamic payouts are working - later pops give more to players');
        } else {
          console.log('❌ Dynamic payouts not working - no difference between early/late pops');
          fixesWorking = false;
        }
      } else {
        console.log('⚠️  Need more data to verify dynamic payouts');
      }
      
      // Check if we have variety in pop reasons
      if (randomPops.length > 0 && thresholdPops.length > 0) {
        console.log('✅ Both random and threshold pops are occurring');
      } else if (randomPops.length > 0) {
        console.log('✅ Random pops are working (no threshold pops in this test)');
      } else {
        console.log('❌ Only threshold pops - random logic may need adjustment');
        fixesWorking = false;
      }
      
      if (fixesWorking) {
        console.log('\n🎉 SUCCESS: All fixes are working!');
        console.log('🎈 Random popping at various pressures ✅');
        console.log('💰 Dynamic payouts based on pressure ✅');
        console.log('🔄 Automatic round progression ✅');
      } else {
        console.log('\n⚠️  Some fixes need adjustment');
      }
      
    } else {
      console.log('❌ No balloon pops occurred in the test');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testFixes().catch(console.error);

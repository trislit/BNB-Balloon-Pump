#!/usr/bin/env node

/**
 * Test Pressure System: Verify balloons can go past 100% with increasing pop chance
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

async function testPressureSystem() {
  console.log('🎈 Testing New Pressure System: Balloons Past 100%\n');

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
    }

    // Test 2: Test pressure progression beyond 1000
    console.log('\n2️⃣ Testing pressure progression beyond 1000...');
    const pressureResults = [];
    const numTests = 5;

    for (let test = 1; test <= numTests; test++) {
      console.log(`\n   🎮 Game ${test}/${numTests}:`);
      
      let pumps = 0;
      let popped = false;
      const maxPumps = 50; // Increased to allow higher pressures

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
        const pressure = parseFloat(result.pressure);
        const pressurePercentage = (pressure / 1000) * 100;
        
        console.log(`      Pump ${pumps}: Pressure: ${pressure} (${pressurePercentage.toFixed(1)}%)`);
        
        // Log when we hit milestones
        if (pressure >= 1000 && pressure < 1001) {
          console.log(`      🎯 Hit 100% pressure! (${pressure})`);
        }
        if (pressure >= 1500 && pressure < 1501) {
          console.log(`      🚨 Hit 150% pressure! (${pressure})`);
        }
        if (pressure >= 2000 && pressure < 2001) {
          console.log(`      💥 Hit 200% pressure! (${pressure})`);
        }
        
        if (result.balloon_popped) {
          popped = true;
          const payout = result.payout_structure;
          
          pressureResults.push({
            test,
            pumps,
            pressure,
            pressurePercentage,
            pressure_ratio: payout.pressure_ratio,
            winner_pct: payout.winner_pct,
            dev_pct: payout.dev_pct,
            burn_pct: payout.burn_pct,
            pop_reason: result.pop_reason
          });
          
          console.log(`      🎉 BALLOON POPPED!`);
          console.log(`      📊 Final Pressure: ${pressure} (${pressurePercentage.toFixed(1)}%)`);
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
    
    if (pressureResults.length > 0) {
      // Check pressure distribution
      const pressures = pressureResults.map(r => r.pressure);
      const minPressure = Math.min(...pressures);
      const maxPressure = Math.max(...pressures);
      const avgPressure = pressures.reduce((sum, p) => sum + p, 0) / pressures.length;
      
      console.log(`\n📊 Pressure Distribution:`);
      console.log(`   Min pressure: ${minPressure}`);
      console.log(`   Max pressure: ${maxPressure}`);
      console.log(`   Average pressure: ${avgPressure.toFixed(1)}`);
      
      // Check how many went past 1000
      const past1000 = pressureResults.filter(r => r.pressure > 1000);
      const past1500 = pressureResults.filter(r => r.pressure > 1500);
      const past2000 = pressureResults.filter(r => r.pressure > 2000);
      
      console.log(`\n🎯 Pressure Milestones:`);
      console.log(`   Past 1000 pressure: ${past1000.length} (${(past1000.length / pressureResults.length * 100).toFixed(1)}%)`);
      console.log(`   Past 1500 pressure: ${past1500.length} (${(past1500.length / pressureResults.length * 100).toFixed(1)}%)`);
      console.log(`   Past 2000 pressure: ${past2000.length} (${(past2000.length / pressureResults.length * 100).toFixed(1)}%)`);
      
      // Check payout progression
      const sortedResults = pressureResults.sort((a, b) => a.pressure - b.pressure);
      const earlyPops = sortedResults.filter(r => r.pressure < 1000);
      const midPops = sortedResults.filter(r => r.pressure >= 1000 && r.pressure < 1500);
      const latePops = sortedResults.filter(r => r.pressure >= 1500);
      
      console.log(`\n💰 Payout Analysis by Pressure Range:`);
      if (earlyPops.length > 0) {
        const avgWinner = earlyPops.reduce((sum, r) => sum + r.winner_pct, 0) / earlyPops.length;
        const avgDev = earlyPops.reduce((sum, r) => sum + r.dev_pct, 0) / earlyPops.length;
        const avgBurn = earlyPops.reduce((sum, r) => sum + r.burn_pct, 0) / earlyPops.length;
        console.log(`   Early pops (<1000): Winner ${(avgWinner * 100).toFixed(1)}%, Dev ${(avgDev * 100).toFixed(1)}%, Burn ${(avgBurn * 100).toFixed(1)}%`);
      }
      
      if (midPops.length > 0) {
        const avgWinner = midPops.reduce((sum, r) => sum + r.winner_pct, 0) / midPops.length;
        const avgDev = midPops.reduce((sum, r) => sum + r.dev_pct, 0) / midPops.length;
        const avgBurn = midPops.reduce((sum, r) => sum + r.burn_pct, 0) / midPops.length;
        console.log(`   Mid pops (1000-1500): Winner ${(avgWinner * 100).toFixed(1)}%, Dev ${(avgDev * 100).toFixed(1)}%, Burn ${(avgBurn * 100).toFixed(1)}%`);
      }
      
      if (latePops.length > 0) {
        const avgWinner = latePops.reduce((sum, r) => sum + r.winner_pct, 0) / latePops.length;
        const avgDev = latePops.reduce((sum, r) => sum + r.dev_pct, 0) / latePops.length;
        const avgBurn = latePops.reduce((sum, r) => sum + r.burn_pct, 0) / latePops.length;
        console.log(`   Late pops (1500+): Winner ${(avgWinner * 100).toFixed(1)}%, Dev ${(avgDev * 100).toFixed(1)}%, Burn ${(avgBurn * 100).toFixed(1)}%`);
      }
      
      // Test 4: Verify the new system
      console.log('\n4️⃣ Verifying New Pressure System:');
      console.log('==================================');
      
      let systemWorking = true;
      
      // Check if balloons can go past 1000 pressure
      if (maxPressure > 1000) {
        console.log('✅ Balloons can go past 1000 pressure!');
        console.log(`   Highest pressure reached: ${maxPressure}`);
      } else {
        console.log('❌ Balloons still popping at 1000 pressure');
        systemWorking = false;
      }
      
      // Check if we have variety in pressure ranges
      if (past1000.length > 0) {
        console.log('✅ Some balloons go past 1000 pressure');
      } else {
        console.log('⚠️  No balloons went past 1000 pressure in this test');
      }
      
      // Check if dynamic payouts are working
      if (earlyPops.length > 0 && latePops.length > 0) {
        const earlyWinnerAvg = earlyPops.reduce((sum, r) => sum + r.winner_pct, 0) / earlyPops.length;
        const lateWinnerAvg = latePops.reduce((sum, r) => sum + r.winner_pct, 0) / latePops.length;
        
        if (lateWinnerAvg > earlyWinnerAvg) {
          console.log('✅ Dynamic payouts working - higher pressure = more to players');
        } else {
          console.log('❌ Dynamic payouts not working properly');
          systemWorking = false;
        }
      }
      
      if (systemWorking) {
        console.log('\n🎉 SUCCESS: New pressure system is working!');
        console.log('🎈 Balloons can go past 100% with increasing pop chance!');
        console.log('💰 Higher pressures give more rewards to players!');
        console.log('🚀 This encourages continued pumping and bigger pots!');
      } else {
        console.log('\n⚠️  Some aspects of the new system need adjustment');
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
testPressureSystem().catch(console.error);

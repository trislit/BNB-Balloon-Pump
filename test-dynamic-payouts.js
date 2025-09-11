#!/usr/bin/env node

/**
 * Test Dynamic Payouts: Verify that payouts change based on pressure
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

async function testDynamicPayouts() {
  console.log('💰 Testing Dynamic Payout System\n');

  try {
    const payoutResults = [];
    const numTests = 15;

    for (let test = 1; test <= numTests; test++) {
      console.log(`\n🎮 Test ${test}/${numTests}:`);
      
      let pumps = 0;
      let popped = false;
      const maxPumps = 30;

      while (pumps < maxPumps && !popped) {
        const randomUser = testUsers[pumps % testUsers.length];
        const randomAmount = (50 + Math.floor(Math.random() * 100)).toString();
        
        const { data: result, error: error } = await supabase
          .rpc('manual_pump', {
            user_address: randomUser,
            pump_amount: randomAmount
          });

        if (error) {
          console.log(`   ❌ Pump failed: ${error.message}`);
          break;
        }
        
        pumps++;
        console.log(`   Pump ${pumps}: Pressure: ${result.pressure}, Popped: ${result.balloon_popped}`);
        
        if (result.balloon_popped) {
          popped = true;
          const pressure = parseFloat(result.pressure);
          const pot = parseFloat(result.pot);
          const payout = result.payout_structure;
          
          payoutResults.push({
            test,
            pumps,
            pressure,
            pot,
            pressure_ratio: payout.pressure_ratio,
            winner_pct: payout.winner_pct,
            second_pct: payout.second_pct,
            third_pct: payout.third_pct,
            dev_pct: payout.dev_pct,
            burn_pct: payout.burn_pct,
            winner_amount: payout.winner_amount,
            second_amount: payout.second_amount,
            third_amount: payout.third_amount,
            dev_amount: payout.dev_amount,
            burn_amount: payout.burn_amount
          });
          
          console.log(`   🎉 BALLOON POPPED!`);
          console.log(`   📊 Pressure: ${pressure} (${(payout.pressure_ratio * 100).toFixed(1)}% of max)`);
          console.log(`   💰 Pot: ${pot}`);
          console.log(`   🏆 Winner: ${(payout.winner_pct * 100).toFixed(1)}% (${payout.winner_amount})`);
          console.log(`   🥈 Second: ${(payout.second_pct * 100).toFixed(1)}% (${payout.second_amount})`);
          console.log(`   🥉 Third: ${(payout.third_pct * 100).toFixed(1)}% (${payout.third_amount})`);
          console.log(`   👨‍💻 Dev: ${(payout.dev_pct * 100).toFixed(1)}% (${payout.dev_amount})`);
          console.log(`   🔥 Burn: ${(payout.burn_pct * 100).toFixed(1)}% (${payout.burn_amount})`);
        }
      }

      if (!popped) {
        console.log(`   ⚠️  Balloon didn't pop after ${pumps} pumps (hit max limit)`);
      }
    }

    // Analyze results
    console.log('\n📊 Dynamic Payout Analysis:');
    console.log('============================');
    
    // Sort by pressure to see the progression
    payoutResults.sort((a, b) => a.pressure - b.pressure);
    
    console.log('\n🎯 Payout Progression (sorted by pressure):');
    console.log('Pressure | Winner% | Second% | Third% | Dev% | Burn% | Total%');
    console.log('---------|---------|---------|--------|------|-------|-------');
    
    payoutResults.forEach(result => {
      const total = result.winner_pct + result.second_pct + result.third_pct + result.dev_pct + result.burn_pct;
      console.log(
        `${result.pressure.toString().padStart(8)} | ` +
        `${(result.winner_pct * 100).toFixed(1).padStart(7)}% | ` +
        `${(result.second_pct * 100).toFixed(1).padStart(7)}% | ` +
        `${(result.third_pct * 100).toFixed(1).padStart(6)}% | ` +
        `${(result.dev_pct * 100).toFixed(1).padStart(4)}% | ` +
        `${(result.burn_pct * 100).toFixed(1).padStart(5)}% | ` +
        `${(total * 100).toFixed(1)}%`
      );
    });
    
    // Calculate averages by pressure ranges
    const earlyPops = payoutResults.filter(r => r.pressure < 300);
    const midPops = payoutResults.filter(r => r.pressure >= 300 && r.pressure < 700);
    const latePops = payoutResults.filter(r => r.pressure >= 700);
    
    console.log('\n📈 Average Payouts by Pressure Range:');
    
    if (earlyPops.length > 0) {
      const avgWinner = earlyPops.reduce((sum, r) => sum + r.winner_pct, 0) / earlyPops.length;
      const avgDev = earlyPops.reduce((sum, r) => sum + r.dev_pct, 0) / earlyPops.length;
      const avgBurn = earlyPops.reduce((sum, r) => sum + r.burn_pct, 0) / earlyPops.length;
      console.log(`Early pops (<300): Winner ${(avgWinner * 100).toFixed(1)}%, Dev ${(avgDev * 100).toFixed(1)}%, Burn ${(avgBurn * 100).toFixed(1)}%`);
    }
    
    if (midPops.length > 0) {
      const avgWinner = midPops.reduce((sum, r) => sum + r.winner_pct, 0) / midPops.length;
      const avgDev = midPops.reduce((sum, r) => sum + r.dev_pct, 0) / midPops.length;
      const avgBurn = midPops.reduce((sum, r) => sum + r.burn_pct, 0) / midPops.length;
      console.log(`Mid pops (300-700): Winner ${(avgWinner * 100).toFixed(1)}%, Dev ${(avgDev * 100).toFixed(1)}%, Burn ${(avgBurn * 100).toFixed(1)}%`);
    }
    
    if (latePops.length > 0) {
      const avgWinner = latePops.reduce((sum, r) => sum + r.winner_pct, 0) / latePops.length;
      const avgDev = latePops.reduce((sum, r) => sum + r.dev_pct, 0) / latePops.length;
      const avgBurn = latePops.reduce((sum, r) => sum + r.burn_pct, 0) / latePops.length;
      console.log(`Late pops (700+): Winner ${(avgWinner * 100).toFixed(1)}%, Dev ${(avgDev * 100).toFixed(1)}%, Burn ${(avgBurn * 100).toFixed(1)}%`);
    }
    
    console.log('\n🎯 Expected Behavior:');
    console.log('- Early pops: More to house (dev/burn), less to players');
    console.log('- Late pops: More to players, less to house');
    console.log('- Winner percentage should increase with pressure');
    console.log('- Dev/Burn percentage should decrease with pressure');
    
    // Verify the system is working
    const hasEarlyPops = earlyPops.length > 0;
    const hasLatePops = latePops.length > 0;
    
    if (hasEarlyPops && hasLatePops) {
      const earlyWinnerAvg = earlyPops.reduce((sum, r) => sum + r.winner_pct, 0) / earlyPops.length;
      const lateWinnerAvg = latePops.reduce((sum, r) => sum + r.winner_pct, 0) / latePops.length;
      
      if (lateWinnerAvg > earlyWinnerAvg) {
        console.log('\n✅ SUCCESS: Dynamic payout system is working!');
        console.log('🎈 Later pops give more to players than early pops!');
        console.log('💰 This encourages players to keep pumping and building the pot!');
      } else {
        console.log('\n⚠️  ISSUE: Payout system may not be working as expected');
      }
    } else {
      console.log('\n⚠️  Need more data points to verify the system');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDynamicPayouts().catch(console.error);

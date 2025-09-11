#!/usr/bin/env node

/**
 * Test Random Popping: Verify that balloons pop randomly, not just at 1000
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

async function testRandomPopping() {
  console.log('🎲 Testing Random Popping Logic\n');

  try {
    const popResults = [];
    const numTests = 10;

    for (let test = 1; test <= numTests; test++) {
      console.log(`\n🎮 Test ${test}/${numTests}:`);
      
      let pumps = 0;
      let popped = false;
      const maxPumps = 25; // Allow more pumps to see random pops

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
          const popReason = result.pop_reason || 'unknown';
          const pressure = parseFloat(result.pressure);
          
          popResults.push({
            test,
            pumps,
            pressure,
            reason: popReason
          });
          
          console.log(`   🎉 BALLOON POPPED!`);
          console.log(`   📊 Pressure: ${pressure}`);
          console.log(`   🎯 Reason: ${popReason}`);
          console.log(`   🏆 Winner: ${result.winner}`);
        }
      }

      if (!popped) {
        console.log(`   ⚠️  Balloon didn't pop after ${pumps} pumps (hit max limit)`);
        popResults.push({
          test,
          pumps,
          pressure: 'max_reached',
          reason: 'no_pop'
        });
      }
    }

    // Analyze results
    console.log('\n📊 Analysis Results:');
    console.log('==================');
    
    const randomPops = popResults.filter(r => r.reason === 'random_pop');
    const thresholdPops = popResults.filter(r => r.reason === 'threshold_reached');
    const noPops = popResults.filter(r => r.reason === 'no_pop');
    
    console.log(`Total tests: ${popResults.length}`);
    console.log(`Random pops: ${randomPops.length} (${(randomPops.length/numTests*100).toFixed(1)}%)`);
    console.log(`Threshold pops: ${thresholdPops.length} (${(thresholdPops.length/numTests*100).toFixed(1)}%)`);
    console.log(`No pops: ${noPops.length} (${(noPops.length/numTests*100).toFixed(1)}%)`);
    
    if (randomPops.length > 0) {
      const avgRandomPressure = randomPops.reduce((sum, r) => sum + r.pressure, 0) / randomPops.length;
      console.log(`\n🎲 Random pop details:`);
      console.log(`Average pressure at random pop: ${avgRandomPressure.toFixed(1)}`);
      console.log(`Pressure range: ${Math.min(...randomPops.map(r => r.pressure))} - ${Math.max(...randomPops.map(r => r.pressure))}`);
    }
    
    if (thresholdPops.length > 0) {
      console.log(`\n🎯 Threshold pop details:`);
      console.log(`All threshold pops were at exactly 1000 pressure: ${thresholdPops.every(r => r.pressure >= 1000)}`);
    }
    
    console.log('\n🎯 Expected Results:');
    console.log('- Random pops should happen at various pressures (not just 1000)');
    console.log('- Random pops should be ~8% of total pumps');
    console.log('- Some balloons should pop before reaching 1000 pressure');
    console.log('- Some balloons should reach 1000 pressure and pop by threshold');
    
    if (randomPops.length > 0 && randomPops.length < numTests) {
      console.log('\n✅ SUCCESS: Random popping is working!');
      console.log('🎈 Balloons are popping at different pressures, not just 1000!');
    } else if (randomPops.length === 0) {
      console.log('\n❌ ISSUE: No random pops detected');
      console.log('🔧 The random logic might need adjustment');
    } else {
      console.log('\n⚠️  All pops were random - might need to adjust the 8% chance');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testRandomPopping().catch(console.error);

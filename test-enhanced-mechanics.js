#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://uvmfrbiojefvtbfgbcfk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM'
);

async function testEnhancedMechanics() {
  console.log('🎮 Testing Enhanced Game Mechanics\n');

  try {
    // Test 1: Check if enhanced functions exist
    console.log('1️⃣ Testing enhanced functions...');
    
    const { data: gameState, error: gameError } = await supabase
      .rpc('get_enhanced_game_state', {
        token_address: '0xTEST0000000000000000000000000000000000000'
      });

    if (gameError) {
      console.log('❌ Enhanced functions not available yet. Please apply enhanced-game-mechanics.sql to your database first.');
      console.log('   Error:', gameError.message);
      return;
    }

    console.log('✅ Enhanced functions available!');
    console.log('   Game State:', JSON.stringify(gameState, null, 2));

    // Test 2: Test burn pool stats
    console.log('\n2️⃣ Testing burn pool stats...');
    
    const { data: burnStats, error: burnError } = await supabase
      .rpc('get_burn_pool_stats');

    if (burnError) {
      console.log('❌ Burn pool stats error:', burnError.message);
    } else {
      console.log('✅ Burn pool stats:', JSON.stringify(burnStats, null, 2));
    }

    // Test 3: Test enhanced pump (if functions are available)
    console.log('\n3️⃣ Testing enhanced pump...');
    
    const { data: pumpResult, error: pumpError } = await supabase
      .rpc('pump_balloon_enhanced', {
        user_address: '0x1111111111111111111111111111111111111111',
        token_address: '0xTEST0000000000000000000000000000000000000',
        pump_amount: '100'
      });

    if (pumpError) {
      console.log('❌ Enhanced pump error:', pumpError.message);
    } else {
      console.log('✅ Enhanced pump result:', JSON.stringify(pumpResult, null, 2));
    }

    console.log('\n🎉 Enhanced mechanics test complete!');
    console.log('\n📋 New Burn Mechanics:');
    console.log('• No burn on individual pumps');
    console.log('• 5% burn only on final payouts when balloon pops');
    console.log('• First pump pop: 47.5% winner, 47.5% house, 5% burn');
    console.log('• Normal pop: 65% winner, 15% second, 10% third, 5% dev, 5% burn');
    console.log('\n📋 Next Steps:');
    console.log('1. Apply enhanced-game-mechanics.sql to your Supabase database');
    console.log('2. Deploy the updated relayer service');
    console.log('3. Test the new mechanics in the frontend');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEnhancedMechanics();

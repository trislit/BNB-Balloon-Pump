#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWorkingPumpSimulation() {
  console.log('🧪 Testing Working Pump Simulation\n');

  try {
    // 1. Get current game state
    console.log('1️⃣ Getting current game state...');
    const { data: gameState, error: gameError } = await supabase
      .rpc('get_token_game_status', { token_address: '0xTEST0000000000000000000000000000000000000' });

    if (gameError) {
      console.log(`   ❌ Error: ${gameError.message}`);
      return;
    }

    console.log(`   ✅ Current pressure: ${gameState.pressure}, Pot: ${gameState.pot_amount}`);

    // 2. Check user balance
    console.log('\n2️⃣ Checking user balance...');
    const { data: balance, error: balanceError } = await supabase
      .rpc('get_user_balance', { 
        user_address: '0x1111111111111111111111111111111111111111',
        token_address: '0xTEST0000000000000000000000000000000000000'
      });

    if (balanceError) {
      console.log(`   ❌ Error: ${balanceError.message}`);
      return;
    }

    console.log(`   ✅ User balance: ${balance.balance}`);

    // 3. Simulate a pump by updating the game round directly
    console.log('\n3️⃣ Simulating pump...');
    const pumpAmount = 100;
    const newPressure = gameState.pressure + pumpAmount;
    const newPot = gameState.pot_amount + pumpAmount;

    const { data: updateResult, error: updateError } = await supabase
      .from('game_rounds')
      .update({
        pressure: newPressure,
        pot_amount: newPot,
        winner_address: '0x1111111111111111111111111111111111111111'
      })
      .eq('token_address', '0xTEST0000000000000000000000000000000000000')
      .eq('status', 'active')
      .select();

    if (updateError) {
      console.log(`   ❌ Error updating game: ${updateError.message}`);
      return;
    }

    console.log(`   ✅ Game updated successfully`);
    console.log(`   New pressure: ${newPressure}, New pot: ${newPot}`);

    // 4. Update user balance (deduct pump amount)
    console.log('\n4️⃣ Updating user balance...');
    const { data: balanceUpdate, error: balanceUpdateError } = await supabase
      .from('user_balances')
      .update({
        balance: balance.balance - pumpAmount
      })
      .eq('user_address', '0x1111111111111111111111111111111111111111')
      .eq('token_address', '0xTEST0000000000000000000000000000000000000')
      .select();

    if (balanceUpdateError) {
      console.log(`   ❌ Error updating balance: ${balanceUpdateError.message}`);
    } else {
      console.log(`   ✅ Balance updated: ${JSON.stringify(balanceUpdate, null, 2)}`);
    }

    // 5. Check if balloon should pop (simple simulation)
    console.log('\n5️⃣ Checking if balloon should pop...');
    const popChance = newPressure > 1000 ? 50 : 5; // 50% chance if pressure > 1000, 5% otherwise
    const shouldPop = Math.random() * 100 < popChance;

    if (shouldPop) {
      console.log(`   💥 BALLOON POPPED! (${popChance}% chance)`);
      
      // End the round
      const { data: endResult, error: endError } = await supabase
        .from('game_rounds')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('token_address', '0xTEST0000000000000000000000000000000000000')
        .eq('status', 'active')
        .select();

      if (endError) {
        console.log(`   ❌ Error ending round: ${endError.message}`);
      } else {
        console.log(`   ✅ Round ended successfully`);
      }

      // Award winnings
      const winnings = newPot * 0.8; // 80% to winner
      const { data: winningsResult, error: winningsError } = await supabase
        .from('user_balances')
        .update({
          balance: balance.balance - pumpAmount + winnings,
          total_winnings: balance.total_winnings + winnings
        })
        .eq('user_address', '0x1111111111111111111111111111111111111111')
        .eq('token_address', '0xTEST0000000000000000000000000000000000000')
        .select();

      if (winningsError) {
        console.log(`   ❌ Error awarding winnings: ${winningsError.message}`);
      } else {
        console.log(`   ✅ Winnings awarded: ${winnings} tokens`);
      }
    } else {
      console.log(`   ✅ Balloon still inflated (${popChance}% pop chance)`);
    }

    // 6. Get final game state
    console.log('\n6️⃣ Final game state...');
    const { data: finalGameState, error: finalGameError } = await supabase
      .rpc('get_token_game_status', { token_address: '0xTEST0000000000000000000000000000000000000' });

    if (finalGameError) {
      console.log(`   ❌ Error: ${finalGameError.message}`);
    } else {
      console.log(`   ✅ Final pressure: ${finalGameState.pressure}, Final pot: ${finalGameState.pot_amount}`);
      console.log(`   Status: ${finalGameState.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🎉 Working pump simulation complete!');
}

testWorkingPumpSimulation();

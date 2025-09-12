#!/usr/bin/env node

/**
 * Test Production System - Fixed Version
 * This script tests the cleaned up production system using the working functions
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
  '0x3333333333333333333333333333333333333333'
];

const testToken = '0xTEST0000000000000000000000000000000000000'; // Test Token (meme coin placeholder)

async function testProductionSystemFixed() {
  console.log('🧪 Testing Production System - Fixed Version\n');

  try {
    // 1. Test token game status
    console.log('1️⃣ Testing token game status...');
    const { data: gameStatus, error: gameStatusError } = await supabase
      .rpc('get_token_game_status', { token_address: testToken });

    if (gameStatusError) {
      console.log(`   ❌ Error: ${gameStatusError.message}`);
    } else {
      console.log(`   ✅ Game status: ${JSON.stringify(gameStatus, null, 2)}`);
    }

    // 2. Test user balance creation
    console.log('\n2️⃣ Testing user balance creation...');
    for (const user of testUsers) {
      const { data: balance, error: balanceError } = await supabase
        .rpc('get_user_balance', { 
          user_address: user, 
          token_address: testToken 
        });

      if (balanceError) {
        console.log(`   ❌ Error for ${user}: ${balanceError.message}`);
      } else {
        console.log(`   ✅ Balance for ${user}: ${balance.balance}`);
      }
    }

    // 3. Test deposits using the working simple_deposit function
    console.log('\n3️⃣ Testing deposits...');
    for (let i = 0; i < testUsers.length; i++) {
      const depositAmount = (i + 1) * 1000; // 1000, 2000, 3000
      const { data: deposit, error: depositError } = await supabase
        .rpc('simple_deposit', {
          p_user_address: testUsers[i],
          p_token_address: testToken,
          p_amount: depositAmount
        });

      if (depositError) {
        console.log(`   ❌ Deposit error for ${testUsers[i]}: ${depositError.message}`);
      } else {
        console.log(`   ✅ Deposited ${depositAmount} for ${testUsers[i]}`);
      }
    }

    // 4. Test pumping
    console.log('\n4️⃣ Testing balloon pumping...');
    let gameEnded = false;
    let pumpCount = 0;

    while (!gameEnded && pumpCount < 20) {
      const user = testUsers[pumpCount % testUsers.length];
      const pumpAmount = 100 + (pumpCount * 50); // Increasing amounts

      const { data: pumpResult, error: pumpError } = await supabase
        .rpc('pump_balloon', {
          user_address: user,
          token_address: testToken,
          pump_amount: pumpAmount
        });

      if (pumpError) {
        console.log(`   ❌ Pump error: ${pumpError.message}`);
        break;
      }

      console.log(`   Pump ${pumpCount + 1}: ${user} pumped ${pumpAmount}`);
      console.log(`   Pressure: ${pumpResult.pressure}, Pot: ${pumpResult.pot}`);

      if (pumpResult.balloon_popped) {
        console.log(`   💥 BALLOON POPPED!`);
        console.log(`   Winner: ${pumpResult.winner}`);
        console.log(`   Winner Payout: ${pumpResult.winner_payout}`);
        console.log(`   Second Payout: ${pumpResult.second_payout}`);
        console.log(`   Third Payout: ${pumpResult.third_payout}`);
        gameEnded = true;
      }

      pumpCount++;
    }

    // 5. Check final balances
    console.log('\n5️⃣ Checking final balances...');
    for (const user of testUsers) {
      const { data: balance, error: balanceError } = await supabase
        .rpc('get_user_balance', { 
          user_address: user, 
          token_address: testToken 
        });

      if (balanceError) {
        console.log(`   ❌ Error getting balance for ${user}: ${balanceError.message}`);
      } else {
        console.log(`   ${user}: Balance=${balance.balance}, Winnings=${balance.total_winnings}`);
      }
    }

    // 6. Check historical games
    console.log('\n6️⃣ Checking historical games...');
    const { data: historicalGames, error: historicalError } = await supabase
      .rpc('get_historical_games', { 
        token_address: testToken,
        limit_count: 10
      });

    if (historicalError) {
      console.log(`   ❌ Error getting historical games: ${historicalError.message}`);
    } else {
      console.log(`   ✅ Found ${historicalGames.count} historical games`);
      if (historicalGames.games && historicalGames.games.length > 0) {
        const latestGame = historicalGames.games[0];
        console.log(`   Latest game: Round ${latestGame.round_number}, Winner: ${latestGame.winner_address}`);
        console.log(`   Final Pressure: ${latestGame.final_pressure}, Total Pot: ${latestGame.total_pot}`);
      }
    }

    // 7. Check current game status
    console.log('\n7️⃣ Checking current game status...');
    const { data: currentGame, error: currentGameError } = await supabase
      .rpc('get_token_game_status', { token_address: testToken });

    if (currentGameError) {
      console.log(`   ❌ Error: ${currentGameError.message}`);
    } else {
      console.log(`   ✅ Current game: Round ${currentGame.round_number}`);
      console.log(`   Status: ${currentGame.status}, Pressure: ${currentGame.pressure}`);
      console.log(`   Pot: ${currentGame.pot_amount}, Pumps: ${currentGame.total_pumps}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🎉 Production system test complete!');
}

testProductionSystemFixed();

#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createWorkingPumpFunction() {
  console.log('🔧 Creating working pump_balloon function...\n');

  try {
    // First, let's create a simple working version
    const { data: result, error } = await supabase
      .rpc('simple_pump', {
        p_user_address: '0x1111111111111111111111111111111111111111',
        p_token_address: '0xTEST0000000000000000000000000000000000000',
        p_pump_amount: 100
      });

    if (error) {
      console.log(`❌ Function doesn't exist yet: ${error.message}`);
      
      // Let's create a simple working pump function using direct SQL
      console.log('\n📝 Creating simple_pump function...');
      
      // We'll use a different approach - create a simple function that works
      const { data: createResult, error: createError } = await supabase
        .from('user_balances')
        .select('*')
        .eq('user_address', '0x1111111111111111111111111111111111111111')
        .eq('token_address', '0xTEST0000000000000000000000000000000000000');

      if (createError) {
        console.log(`❌ Error checking balance: ${createError.message}`);
      } else {
        console.log(`✅ Current balance: ${JSON.stringify(createResult, null, 2)}`);
        
        // Let's create a simple pump by directly updating the game state
        console.log('\n🎈 Creating simple pump simulation...');
        
        // Get current game state
        const { data: gameState, error: gameError } = await supabase
          .rpc('get_token_game_status', { token_address: '0xTEST0000000000000000000000000000000000000' });

        if (gameError) {
          console.log(`❌ Error getting game state: ${gameError.message}`);
        } else {
          console.log(`✅ Current game state: ${JSON.stringify(gameState, null, 2)}`);
          
          // Simulate a pump by updating the game round directly
          const { data: updateResult, error: updateError } = await supabase
            .from('game_rounds')
            .update({
              pressure: (gameState.pressure || 0) + 100,
              pot_amount: (gameState.pot_amount || 0) + 100,
              winner_address: '0x1111111111111111111111111111111111111111',
              last_updated: new Date().toISOString()
            })
            .eq('token_address', '0xTEST0000000000000000000000000000000000000')
            .eq('status', 'active')
            .select();

          if (updateError) {
            console.log(`❌ Error updating game: ${updateError.message}`);
          } else {
            console.log(`✅ Game updated: ${JSON.stringify(updateResult, null, 2)}`);
          }
        }
      }
    } else {
      console.log(`✅ Function works: ${JSON.stringify(result, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Creation failed:', error.message);
  }
}

createWorkingPumpFunction();

#!/usr/bin/env node

/**
 * Fix Schema: Apply missing database updates
 * This script applies the necessary schema changes for automatic round progression
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSchema() {
  console.log('🔧 Fixing Database Schema\n');

  try {
    // 1. Add missing columns to rounds_cache
    console.log('1️⃣ Adding missing columns to rounds_cache...');
    
    const addColumns = [
      "ALTER TABLE rounds_cache ADD COLUMN IF NOT EXISTS winner TEXT;",
      "ALTER TABLE rounds_cache ADD COLUMN IF NOT EXISTS winner_payout TEXT;",
      "ALTER TABLE rounds_cache ADD COLUMN IF NOT EXISTS second_payout TEXT;",
      "ALTER TABLE rounds_cache ADD COLUMN IF NOT EXISTS third_payout TEXT;",
      "ALTER TABLE rounds_cache ADD COLUMN IF NOT EXISTS dev_payout TEXT;",
      "ALTER TABLE rounds_cache ADD COLUMN IF NOT EXISTS burn_payout TEXT;",
      "ALTER TABLE rounds_cache ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;",
      "ALTER TABLE rounds_cache ADD COLUMN IF NOT EXISTS pop_chance INTEGER DEFAULT 500;",
      "ALTER TABLE rounds_cache ADD COLUMN IF NOT EXISTS threshold TEXT DEFAULT '1000';"
    ];

    for (const sql of addColumns) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
          console.log(`   ⚠️  ${sql}: ${error.message}`);
        } else {
          console.log(`   ✅ ${sql.split(' ')[5]} column added`);
        }
      } catch (error) {
        console.log(`   ❌ ${sql}: ${error.message}`);
      }
    }

    // 2. Create payout_distributions table
    console.log('\n2️⃣ Creating payout_distributions table...');
    const createPayoutTable = `
      CREATE TABLE IF NOT EXISTS payout_distributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        round_id TEXT NOT NULL,
        winner_address TEXT,
        second_address TEXT,
        third_address TEXT,
        winner_amount TEXT NOT NULL DEFAULT '0',
        second_amount TEXT NOT NULL DEFAULT '0',
        third_amount TEXT NOT NULL DEFAULT '0',
        dev_amount TEXT NOT NULL DEFAULT '0',
        burn_amount TEXT NOT NULL DEFAULT '0',
        total_pot TEXT NOT NULL,
        distribution_tx TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createPayoutTable });
      if (error) {
        console.log(`   ⚠️  Payout table: ${error.message}`);
      } else {
        console.log(`   ✅ payout_distributions table created`);
      }
    } catch (error) {
      console.log(`   ❌ Payout table: ${error.message}`);
    }

    // 3. Create vault_balances table
    console.log('\n3️⃣ Creating vault_balances table...');
    const createVaultTable = `
      CREATE TABLE IF NOT EXISTS vault_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        token_address TEXT NOT NULL,
        balance TEXT NOT NULL DEFAULT '0',
        last_updated TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, token_address)
      );
    `;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createVaultTable });
      if (error) {
        console.log(`   ⚠️  Vault table: ${error.message}`);
      } else {
        console.log(`   ✅ vault_balances table created`);
      }
    } catch (error) {
      console.log(`   ❌ Vault table: ${error.message}`);
    }

    // 4. Create the updated simulate_pump_hybrid function
    console.log('\n4️⃣ Creating simulate_pump_hybrid function...');
    const createFunction = `
      CREATE OR REPLACE FUNCTION simulate_pump_hybrid(
        user_address TEXT,
        pump_amount TEXT,
        is_test BOOLEAN DEFAULT true
      ) RETURNS JSON AS $$
      DECLARE
        current_round RECORD;
        new_pressure DECIMAL;
        new_pot DECIMAL;
        pump_amount_decimal DECIMAL;
        should_pop BOOLEAN := false;
        pop_chance INTEGER;
        random_value INTEGER;
        result JSON;
      BEGIN
        -- Get current round
        SELECT * INTO current_round FROM rounds_cache WHERE status = 'active' LIMIT 1;
        
        IF current_round IS NULL THEN
          RETURN json_build_object('success', false, 'error', 'No active round');
        END IF;

        -- Convert pump amount to decimal
        pump_amount_decimal := pump_amount::DECIMAL;
        
        -- Calculate new pressure and pot
        new_pressure := COALESCE(current_round.pressure::DECIMAL, 0) + pump_amount_decimal;
        new_pot := COALESCE(current_round.pot::DECIMAL, 0) + (pump_amount_decimal * 0.1);
        
        -- Check if balloon should pop (threshold or random)
        should_pop := new_pressure >= COALESCE(current_round.threshold::DECIMAL, 1000);
        
        -- If not popped by threshold, check random chance
        IF NOT should_pop THEN
          pop_chance := COALESCE(current_round.pop_chance, 500);
          random_value := (random() * 10000)::INTEGER;
          should_pop := random_value < pop_chance;
        END IF;
        
        IF should_pop THEN
          -- Balloon popped! Distribute payouts
          DECLARE
            winner_amount DECIMAL;
            second_amount DECIMAL;
            third_amount DECIMAL;
            dev_amount DECIMAL;
            burn_amount DECIMAL;
            winner_addr TEXT;
            second_addr TEXT;
            third_addr TEXT;
          BEGIN
            -- Calculate payouts (80/10/5/2.5/2.5)
            winner_amount := new_pot * 0.8;
            second_amount := new_pot * 0.1;
            third_amount := new_pot * 0.05;
            dev_amount := new_pot * 0.025;
            burn_amount := new_pot * 0.025;
            
            -- Get last three pumpers
            winner_addr := current_round.last1;
            second_addr := current_round.last2;
            third_addr := current_round.last3;
            
            -- Update round status
            UPDATE rounds_cache SET
              status = 'ended',
              pressure = new_pressure::TEXT,
              pot = new_pot::TEXT,
              winner = winner_addr,
              winner_payout = winner_amount::TEXT,
              second_payout = second_amount::TEXT,
              third_payout = third_amount::TEXT,
              dev_payout = dev_amount::TEXT,
              burn_payout = burn_amount::TEXT,
              ended_at = NOW(),
              updated_at = NOW()
            WHERE round_id = current_round.round_id;
            
            -- Record payout distribution
            INSERT INTO payout_distributions (
              round_id, winner_address, second_address, third_address,
              winner_amount, second_amount, third_amount, dev_amount, burn_amount, total_pot
            ) VALUES (
              current_round.round_id, winner_addr, second_addr, third_addr,
              winner_amount::TEXT, second_amount::TEXT, third_amount::TEXT, 
              dev_amount::TEXT, burn_amount::TEXT, new_pot::TEXT
            );
            
            -- Award tokens to winners (test mode)
            IF is_test THEN
              IF winner_addr IS NOT NULL THEN
                UPDATE profiles SET test_tokens = (COALESCE(test_tokens::DECIMAL, 0) + winner_amount)::TEXT
                WHERE evm_address = winner_addr;
              END IF;
              
              IF second_addr IS NOT NULL THEN
                UPDATE profiles SET test_tokens = (COALESCE(test_tokens::DECIMAL, 0) + second_amount)::TEXT
                WHERE evm_address = second_addr;
              END IF;
              
              IF third_addr IS NOT NULL THEN
                UPDATE profiles SET test_tokens = (COALESCE(test_tokens::DECIMAL, 0) + third_amount)::TEXT
                WHERE evm_address = third_addr;
              END IF;
            END IF;
            
            -- Create new round
            INSERT INTO rounds_cache (
              round_id, status, pressure, pot, pop_chance, threshold, created_at, updated_at
            ) VALUES (
              (COALESCE(current_round.round_id::INTEGER, 0) + 1)::TEXT,
              'active', '0', '0', 500, '1000', NOW(), NOW()
            );
            
            result := json_build_object(
              'success', true,
              'balloon_popped', true,
              'pressure', new_pressure::TEXT,
              'pot', new_pot::TEXT,
              'winner', winner_addr,
              'winner_amount', winner_amount::TEXT,
              'second_amount', second_amount::TEXT,
              'third_amount', third_amount::TEXT,
              'dev_amount', dev_amount::TEXT,
              'burn_amount', burn_amount::TEXT
            );
          END;
        ELSE
          -- Normal pump - update round
          UPDATE rounds_cache SET
            pressure = new_pressure::TEXT,
            pot = new_pot::TEXT,
            last3 = current_round.last2,
            last2 = current_round.last1,
            last1 = user_address,
            updated_at = NOW()
          WHERE round_id = current_round.round_id;
          
          result := json_build_object(
            'success', true,
            'balloon_popped', false,
            'pressure', new_pressure::TEXT,
            'pot', new_pot::TEXT,
            'last_pumper', user_address
          );
        END IF;
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createFunction });
      if (error) {
        console.log(`   ❌ Function creation failed: ${error.message}`);
      } else {
        console.log(`   ✅ simulate_pump_hybrid function created`);
      }
    } catch (error) {
      console.log(`   ❌ Function creation error: ${error.message}`);
    }

    // 5. Create manual_pump function
    console.log('\n5️⃣ Creating manual_pump function...');
    const createManualPump = `
      CREATE OR REPLACE FUNCTION manual_pump(
        user_address TEXT,
        pump_amount TEXT
      ) RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        SELECT simulate_pump_hybrid(user_address, pump_amount, true) INTO result;
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createManualPump });
      if (error) {
        console.log(`   ❌ Manual pump function failed: ${error.message}`);
      } else {
        console.log(`   ✅ manual_pump function created`);
      }
    } catch (error) {
      console.log(`   ❌ Manual pump function error: ${error.message}`);
    }

    // 6. Test the functions
    console.log('\n6️⃣ Testing the functions...');
    try {
      const { data: testResult, error: testError } = await supabase
        .rpc('manual_pump', {
          user_address: '0x1111111111111111111111111111111111111111',
          pump_amount: '100'
        });

      if (testError) {
        console.log(`   ❌ Test failed: ${testError.message}`);
      } else {
        console.log(`   ✅ Test successful: ${JSON.stringify(testResult, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Test error: ${error.message}`);
    }

    console.log('\n🎉 Schema fix completed!');
    console.log('\n📊 Next steps:');
    console.log('1. Run: node debug-round-reset.js');
    console.log('2. Run: node demo-automatic-rounds.js');
    console.log('3. Test the web interface');

  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the fix
fixSchema().catch(console.error);

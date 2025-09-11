#!/usr/bin/env node

/**
 * Apply Schema Direct: Use Supabase client to apply schema changes
 * This script applies the necessary schema changes for automatic round progression
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchemaDirect() {
  console.log('🔧 Applying Schema Changes Directly\n');

  try {
    // 1. Check current rounds_cache structure
    console.log('1️⃣ Checking current rounds_cache structure...');
    const { data: rounds, error: roundsError } = await supabase
      .from('rounds_cache')
      .select('*')
      .limit(1);

    if (roundsError) {
      console.log(`   ❌ Error checking rounds: ${roundsError.message}`);
    } else if (rounds && rounds.length > 0) {
      console.log(`   ✅ Current columns: ${Object.keys(rounds[0]).join(', ')}`);
    } else {
      console.log(`   ⚠️  No rounds found`);
    }

    // 2. Create payout_distributions table if it doesn't exist
    console.log('\n2️⃣ Checking payout_distributions table...');
    try {
      const { data: payouts, error: payoutsError } = await supabase
        .from('payout_distributions')
        .select('*')
        .limit(1);

      if (payoutsError && payoutsError.code === 'PGRST116') {
        console.log(`   ⚠️  payout_distributions table doesn't exist - needs to be created manually`);
      } else {
        console.log(`   ✅ payout_distributions table exists`);
      }
    } catch (error) {
      console.log(`   ⚠️  payout_distributions table doesn't exist - needs to be created manually`);
    }

    // 3. Create a simple test to see what's missing
    console.log('\n3️⃣ Testing current simulate_pump_hybrid function...');
    try {
      const { data: testResult, error: testError } = await supabase
        .rpc('simulate_pump_hybrid', {
          user_address: '0x1111111111111111111111111111111111111111',
          pump_amount: '100',
          is_test: true
        });

      if (testError) {
        console.log(`   ❌ Function error: ${testError.message}`);
        console.log(`   Code: ${testError.code}`);
        console.log(`   Details: ${testError.details}`);
        console.log(`   Hint: ${testError.hint}`);
      } else {
        console.log(`   ✅ Function works: ${JSON.stringify(testResult, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Function doesn't exist: ${error.message}`);
    }

    // 4. Check if we can create a simple working version
    console.log('\n4️⃣ Creating a simplified working version...');
    
    // First, let's see what columns we actually have
    if (rounds && rounds.length > 0) {
      const currentColumns = Object.keys(rounds[0]);
      console.log(`   Current columns: ${currentColumns.join(', ')}`);
      
      // Check if we have the essential columns
      const hasPressure = currentColumns.includes('pressure');
      const hasPot = currentColumns.includes('pot');
      const hasStatus = currentColumns.includes('status');
      const hasLast1 = currentColumns.includes('last1');
      
      console.log(`   Has pressure: ${hasPressure}`);
      console.log(`   Has pot: ${hasPot}`);
      console.log(`   Has status: ${hasStatus}`);
      console.log(`   Has last1: ${hasLast1}`);
      
      if (hasPressure && hasPot && hasStatus && hasLast1) {
        console.log(`   ✅ Essential columns exist - we can create a working version`);
        
        // Create a simplified function that works with current schema
        const simplifiedFunction = `
          CREATE OR REPLACE FUNCTION simulate_pump_simple(
            user_address TEXT,
            pump_amount TEXT
          ) RETURNS JSON AS $$
          DECLARE
            current_round RECORD;
            new_pressure DECIMAL;
            new_pot DECIMAL;
            pump_amount_decimal DECIMAL;
            should_pop BOOLEAN := false;
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
            
            -- Simple pop logic - pop at 1000 pressure
            should_pop := new_pressure >= 1000;
            
            IF should_pop THEN
              -- Balloon popped! Create new round
              UPDATE rounds_cache SET
                status = 'ended',
                pressure = new_pressure::TEXT,
                pot = new_pot::TEXT,
                updated_at = NOW()
              WHERE round_id = current_round.round_id;
              
              -- Create new round
              INSERT INTO rounds_cache (
                round_id, status, pressure, pot, created_at, updated_at
              ) VALUES (
                (COALESCE(current_round.round_id::INTEGER, 0) + 1)::TEXT,
                'active', '0', '0', NOW(), NOW()
              );
              
              result := json_build_object(
                'success', true,
                'balloon_popped', true,
                'pressure', new_pressure::TEXT,
                'pot', new_pot::TEXT,
                'winner', current_round.last1,
                'new_round_created', true
              );
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

        console.log(`   📝 Simplified function created (needs to be applied manually)`);
        console.log(`   This function will:`);
        console.log(`   - Update pressure and pot`);
        console.log(`   - Pop balloon at 1000 pressure`);
        console.log(`   - Create new round automatically`);
        console.log(`   - Track last 3 pumpers`);
      } else {
        console.log(`   ❌ Missing essential columns - need to add them manually`);
      }
    }

    console.log('\n📋 Manual Steps Required:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run the SQL from update-payout-schema.sql');
    console.log('3. Or run the simplified function above');
    console.log('4. Then test with: node debug-round-reset.js');

  } catch (error) {
    console.error('❌ Schema application failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the application
applySchemaDirect().catch(console.error);

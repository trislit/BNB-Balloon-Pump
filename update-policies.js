#!/usr/bin/env node

// Script to update Supabase RLS policies programmatically
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePolicies() {
  console.log('🔧 Updating Supabase RLS policies...');
  console.log(`URL: ${supabaseUrl}`);

  try {
    // Check if tables exist first
    const { data: tables, error: tableError } = await supabase
      .from('user_sessions')
      .select('count')
      .limit(1);

    if (tableError) {
      console.error('❌ Tables do not exist. Please run the setup-supabase.sql first');
      console.log('📋 Copy SQL from setup-supabase.sql and run it in Supabase SQL Editor');
      process.exit(1);
    }

    console.log('✅ Tables exist, updating policies...');

    // List of tables to update
    const tablesToUpdate = [
      'user_sessions',
      'game_sessions',
      'game_players',
      'user_actions',
      'blockchain_cache'
    ];

    // Old restrictive policies to drop
    const oldPolicies = [
      'Users can view own sessions',
      'Users can insert own sessions',
      'Users can update own sessions',
      'Users can view game sessions',
      'Users can insert game sessions',
      'Users can update game sessions',
      'Users can view game players',
      'Users can insert game players',
      'Users can update own game players',
      'Users can view user actions',
      'Users can insert user actions',
      'Public can view blockchain cache',
      'Public can insert blockchain cache',
      'Public can update blockchain cache'
    ];

    // New permissive policies to create
    const newPolicies = [
      {
        table: 'user_sessions',
        policy: 'Allow all operations on user_sessions',
        sql: 'CREATE POLICY "Allow all operations on user_sessions" ON user_sessions FOR ALL USING (true);'
      },
      {
        table: 'game_sessions',
        policy: 'Allow all operations on game_sessions',
        sql: 'CREATE POLICY "Allow all operations on game_sessions" ON game_sessions FOR ALL USING (true);'
      },
      {
        table: 'game_players',
        policy: 'Allow all operations on game_players',
        sql: 'CREATE POLICY "Allow all operations on game_players" ON game_players FOR ALL USING (true);'
      },
      {
        table: 'user_actions',
        policy: 'Allow all operations on user_actions',
        sql: 'CREATE POLICY "Allow all operations on user_actions" ON user_actions FOR ALL USING (true);'
      },
      {
        table: 'blockchain_cache',
        policy: 'Allow all operations on blockchain_cache',
        sql: 'CREATE POLICY "Allow all operations on blockchain_cache" ON blockchain_cache FOR ALL USING (true);'
      }
    ];

    // Try to drop old policies (ignore errors if they don't exist)
    console.log('🗑️  Dropping old restrictive policies...');
    for (const table of tablesToUpdate) {
      for (const policy of oldPolicies) {
        try {
          const { error } = await supabase.rpc('drop_policy_if_exists', {
            table_name: table,
            policy_name: policy
          });

          if (error && !error.message.includes('does not exist')) {
            console.log(`⚠️  Could not drop policy "${policy}" on ${table}:`, error.message);
          }
        } catch (err) {
          // Ignore errors for policies that don't exist
          if (!err.message.includes('does not exist')) {
            console.log(`⚠️  Error dropping policy "${policy}" on ${table}:`, err.message);
          }
        }
      }
    }

    // Try to drop new policies if they exist (in case of re-run)
    console.log('🗑️  Dropping existing permissive policies...');
    for (const policyConfig of newPolicies) {
      try {
        const { error } = await supabase.rpc('drop_policy_if_exists', {
          table_name: policyConfig.table,
          policy_name: policyConfig.policy
        });

        if (error && !error.message.includes('does not exist')) {
          console.log(`⚠️  Could not drop policy "${policyConfig.policy}":`, error.message);
        }
      } catch (err) {
        // Ignore errors for policies that don't exist
      }
    }

    // Create new permissive policies
    console.log('✅ Creating new permissive policies...');
    for (const policyConfig of newPolicies) {
      try {
        // Use raw SQL execution since Supabase doesn't have a direct policy creation RPC
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: policyConfig.sql
        });

        if (error) {
          console.log(`⚠️  Could not create policy on ${policyConfig.table}:`, error.message);
          console.log('💡 You may need to run the SQL manually in the Supabase dashboard');
        } else {
          console.log(`✅ Created policy for ${policyConfig.table}`);
        }
      } catch (err) {
        console.log(`⚠️  Error creating policy for ${policyConfig.table}:`, err.message);
        console.log('💡 Falling back to manual SQL execution needed');
      }
    }

    console.log('');
    console.log('🎯 Policy update attempt completed!');
    console.log('');
    console.log('📋 If you see any "exec_sql" errors above, run this SQL manually in Supabase:');
    console.log('');
    console.log('-- Drop old policies');
    console.log('DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;');
    console.log('DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;');
    console.log('DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;');
    console.log('-- ... (and so on for all tables)');
    console.log('');
    console.log('-- Create new permissive policies');
    console.log('CREATE POLICY "Allow all operations on user_sessions" ON user_sessions FOR ALL USING (true);');
    console.log('CREATE POLICY "Allow all operations on game_sessions" ON game_sessions FOR ALL USING (true);');
    console.log('CREATE POLICY "Allow all operations on game_players" ON game_players FOR ALL USING (true);');
    console.log('CREATE POLICY "Allow all operations on user_actions" ON user_actions FOR ALL USING (true);');
    console.log('CREATE POLICY "Allow all operations on blockchain_cache" ON blockchain_cache FOR ALL USING (true);');

  } catch (error) {
    console.error('❌ Error updating policies:', error.message);
    console.log('');
    console.log('💡 Alternative: Run the SQL manually in Supabase dashboard');
    console.log('   File: update-rls-policies.sql');
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function updatePoliciesDirect() {
  console.log('🔧 Attempting direct SQL execution...');

  try {
    // This is a more direct approach using the Supabase client's internal methods
    const sqlStatements = [
      // Drop old policies
      `DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;`,
      `DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;`,
      `DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;`,
      `DROP POLICY IF EXISTS "Users can view game sessions" ON game_sessions;`,
      `DROP POLICY IF EXISTS "Users can insert game sessions" ON game_sessions;`,
      `DROP POLICY IF EXISTS "Users can update game sessions" ON game_sessions;`,
      `DROP POLICY IF EXISTS "Users can view game players" ON game_players;`,
      `DROP POLICY IF EXISTS "Users can insert game players" ON game_players;`,
      `DROP POLICY IF EXISTS "Users can update own game players" ON game_players;`,
      `DROP POLICY IF EXISTS "Users can view user actions" ON user_actions;`,
      `DROP POLICY IF EXISTS "Users can insert user actions" ON user_actions;`,
      `DROP POLICY IF EXISTS "Public can view blockchain cache" ON blockchain_cache;`,
      `DROP POLICY IF EXISTS "Public can insert blockchain cache" ON blockchain_cache;`,
      `DROP POLICY IF EXISTS "Public can update blockchain cache" ON blockchain_cache;`,

      // Also drop permissive policies if they exist (for re-run)
      `DROP POLICY IF EXISTS "Allow all operations on user_sessions" ON user_sessions;`,
      `DROP POLICY IF EXISTS "Allow all operations on game_sessions" ON game_sessions;`,
      `DROP POLICY IF EXISTS "Allow all operations on game_players" ON game_players;`,
      `DROP POLICY IF EXISTS "Allow all operations on user_actions" ON user_actions;`,
      `DROP POLICY IF EXISTS "Allow all operations on blockchain_cache" ON blockchain_cache;`,

      // Create new permissive policies
      `CREATE POLICY "Allow all operations on user_sessions" ON user_sessions FOR ALL USING (true);`,
      `CREATE POLICY "Allow all operations on game_sessions" ON game_sessions FOR ALL USING (true);`,
      `CREATE POLICY "Allow all operations on game_players" ON game_players FOR ALL USING (true);`,
      `CREATE POLICY "Allow all operations on user_actions" ON user_actions FOR ALL USING (true);`,
      `CREATE POLICY "Allow all operations on blockchain_cache" ON blockchain_cache FOR ALL USING (true);`
    ];

    console.log('📋 You need to run these SQL statements manually in Supabase SQL Editor:');
    console.log('');
    sqlStatements.forEach((sql, index) => {
      console.log(`${index + 1}. ${sql}`);
    });
    console.log('');
    console.log('🎯 Or copy from the file: update-rls-policies.sql');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the policy update
console.log('🚀 Supabase RLS Policy Update Script');
console.log('=====================================');
console.log('');

updatePolicies().then(() => {
  console.log('');
  console.log('🎉 Policy update process completed!');
  console.log('Run: npm run test');
  console.log('Then: npm run dev');
}).catch(() => {
  console.log('');
  console.log('📋 Falling back to manual SQL execution...');
  updatePoliciesDirect();
});

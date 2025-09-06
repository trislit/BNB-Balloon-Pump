#!/usr/bin/env node

// Test database user creation
console.log('🗄️  BNB Balloon Pump - Database Test');
console.log('====================================\n');

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

if (SUPABASE_URL === 'your-supabase-url' || SUPABASE_ANON_KEY === 'your-supabase-anon-key') {
  console.log('❌ Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabase() {
  try {
    console.log('🔍 Checking user_sessions table...');

    // Check if table exists and has data
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .limit(5);

    if (error) {
      console.log('❌ Database error:', error.message);
      return;
    }

    console.log(`✅ Found ${data.length} user sessions in database:`);
    data.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.player_name} (${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)})`);
      console.log(`     Tokens: ${user.token_balance}, Session: ${user.session_id.slice(0, 12)}...`);
    });

    if (data.length === 0) {
      console.log('⚠️  No users found in database. Users might not be getting created.');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testDatabase();


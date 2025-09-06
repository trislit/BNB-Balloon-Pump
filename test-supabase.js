#!/usr/bin/env node

// Quick test script to verify Supabase connection
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.log('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🧪 Testing Supabase connection...');
  console.log(`URL: ${supabaseUrl}`);

  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('user_sessions')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);

      if (error.message.includes('relation "public.user_sessions" does not exist')) {
        console.log('💡 Tip: Make sure you ran the SQL setup in Supabase dashboard');
        console.log('   File: setup-supabase.sql');
        console.log('   Location: Supabase SQL Editor');
      }

      return false;
    }

    console.log('✅ Supabase connection successful!');
    console.log('✅ Database tables are accessible');

    // Test a simple insert (this will fail due to RLS, but shows connection works)
    console.log('🧪 Testing table access...');

    const testSession = {
      session_id: `test_${Date.now()}`,
      wallet_address: '0x0000000000000000000000000000000000000000',
      player_name: 'TestUser'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('user_sessions')
      .insert([testSession]);

    if (insertError) {
      if (insertError.message.includes('permission denied')) {
        console.log('✅ Tables exist and RLS is working (expected permission error)');
        console.log('🎉 Your Supabase setup is complete!');
        return true;
      } else {
        console.error('❌ Unexpected error:', insertError.message);
        return false;
      }
    }

    console.log('✅ Test insert successful');
    return true;

  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('\n🎈 Ready to start your BNB Balloon Pump game!');
    console.log('Run: npm run dev');
  } else {
    console.log('\n❌ Please check your setup and try again');
  }
  process.exit(success ? 0 : 1);
});

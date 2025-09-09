#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Use environment variables or defaults
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPumpsTable() {
  console.log('🔍 Checking pumps table structure...\n');

  try {
    // Try to get a sample record to see what columns exist
    const { data, error } = await supabase
      .from('pumps')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ Error querying pumps table: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Pumps table structure:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('📝 Pumps table is empty, trying to insert a test record...');
      
      // Try to insert a basic record to see what columns are available
      const { data: insertData, error: insertError } = await supabase
        .from('pumps')
        .insert([{
          user_id: '0x1234567890123456789012345678901234567890',
          spend: '100',
          status: 'queued'
        }])
        .select()
        .single();

      if (insertError) {
        console.log(`❌ Insert failed: ${insertError.message}`);
      } else {
        console.log('✅ Insert successful, table structure:');
        console.log(JSON.stringify(insertData, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkPumpsTable();

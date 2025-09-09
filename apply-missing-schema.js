#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Use environment variables or defaults
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMissingSchema() {
  console.log('🔧 Applying missing schema to Supabase...\n');

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('setup-missing-schema.sql', 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.log(`❌ Error in statement ${i + 1}: ${error.message}`);
            console.log(`   Statement: ${statement.substring(0, 100)}...`);
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Exception in statement ${i + 1}: ${err.message}`);
        }
      }
    }

    console.log('\n🎉 Schema application complete!');
    
    // Verify the setup
    console.log('\n🔍 Verifying setup...');
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('simulate_pump_hybrid', {
        user_address: '0x0000000000000000000000000000000000000000',
        pump_amount: '0',
        is_test: true
      });

    if (verifyError) {
      console.log(`❌ Verification failed: ${verifyError.message}`);
    } else {
      console.log(`✅ Verification successful! Function is working.`);
    }

  } catch (error) {
    console.error('❌ Schema application failed:', error.message);
  }
}

applyMissingSchema();

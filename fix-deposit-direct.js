#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://uvmfrbiojefvtbfgbcfk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDepositFunction() {
  console.log('🔧 Fixing deposit_tokens function directly...\n');

  try {
    // Read the SQL file
    const fs = require('fs');
    const sqlContent = fs.readFileSync('fix-deposit-function-only.sql', 'utf8');
    
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
          
          // Use the rpc function to execute SQL
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

    console.log('\n🎉 Deposit function fix complete!');
    
    // Test the fixed function
    console.log('\n🧪 Testing the fixed function...');
    const { data: testResult, error: testError } = await supabase
      .rpc('deposit_tokens', {
        user_address: '0x1111111111111111111111111111111111111111',
        token_address: '0xTEST0000000000000000000000000000000000000',
        amount: 1000
      });

    if (testError) {
      console.log(`❌ Test failed: ${testError.message}`);
    } else {
      console.log(`✅ Test successful: ${JSON.stringify(testResult, null, 2)}`);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixDepositFunction();

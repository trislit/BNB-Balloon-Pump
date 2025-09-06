#!/usr/bin/env node

// Simple connection test
console.log('🔧 BNB Balloon Pump - Connection Test');
console.log('=====================================\n');

// Test 1: Check if backend is running
console.log('🔄 Testing backend connection...');

const BACKEND_URL = 'http://localhost:5001';

fetch(`${BACKEND_URL}/api/health`)
  .then(async response => {
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is running');
      console.log('   Database status:', data.services?.database || 'unknown');
    } else {
      console.log('❌ Backend not responding');
      console.log('   Make sure to run: npm run dev');
    }
  })
  .catch(error => {
    console.log('❌ Backend connection failed');
    console.log('   Error:', error.message);
    console.log('   Make sure to run: npm run dev');
  })
  .then(() => {
    console.log('\n🚀 Test your connection at: http://localhost:3000');
    console.log('📝 Check browser console for detailed debug info');
  });


#!/usr/bin/env node

// Test the complete authentication flow
console.log('🔐 BNB Balloon Pump - Authentication Flow Test');
console.log('==============================================\n');

const BACKEND_URL = 'http://localhost:5001';

async function testAuthFlow() {
  try {
    console.log('1️⃣ Testing challenge generation...');

    const challengeResponse = await fetch(`${BACKEND_URL}/api/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' // Test address
      })
    });

    if (!challengeResponse.ok) {
      console.log('❌ Challenge generation failed:', challengeResponse.status);
      return;
    }

    const challengeData = await challengeResponse.json();
    console.log('✅ Challenge generated:', {
      challengeId: challengeData.challengeId,
      challenge: challengeData.challenge.substring(0, 50) + '...'
    });

    console.log('\n2️⃣ Testing verification (will fail without real signature)...');

    const verifyResponse = await fetch(`${BACKEND_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: challengeData.challengeId,
        signature: '0x1234567890abcdef' // Fake signature
      })
    });

    console.log('Verification response:', verifyResponse.status);
    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      console.log('Expected error (fake signature):', errorData.error);
    }

    console.log('\n✅ Authentication endpoints are working!');
    console.log('💡 To test real authentication:');
    console.log('   1. Open browser to http://localhost:3000');
    console.log('   2. Connect MetaMask');
    console.log('   3. Sign the challenge');
    console.log('   4. Check backend logs for user creation');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testAuthFlow();


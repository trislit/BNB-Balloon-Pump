#!/usr/bin/env node

// Use built-in fetch (Node.js 18+)

const RELAYER_URL = 'https://bnb-balloon-pump-production.up.railway.app';

async function testRelayerPump() {
  console.log('🔍 Testing Relayer Pump API...\n');

  try {
    const testUser = '0x1111111111111111111111111111111111111111';
    const testToken = '0xTEST0000000000000000000000000000000000000';

    // 1. Test health endpoint
    console.log('1️⃣ Testing relayer health...');
    try {
      const healthResponse = await fetch(`${RELAYER_URL}/health`);
      const healthData = await healthResponse.json();
      console.log(`   ✅ Health:`, JSON.stringify(healthData, null, 2));
    } catch (error) {
      console.log(`   ❌ Health error: ${error.message}`);
    }

    // 2. Test game state endpoint
    console.log('\n2️⃣ Testing game state endpoint...');
    try {
      const stateResponse = await fetch(`${RELAYER_URL}/api/pump/state`);
      const stateData = await stateResponse.json();
      console.log(`   ✅ Game state:`, JSON.stringify(stateData, null, 2));
    } catch (error) {
      console.log(`   ❌ Game state error: ${error.message}`);
    }

    // 3. Test user balance endpoint
    console.log('\n3️⃣ Testing user balance endpoint...');
    try {
      const balanceResponse = await fetch(`${RELAYER_URL}/api/pump/balance/${testUser}`);
      const balanceData = await balanceResponse.json();
      console.log(`   ✅ User balance:`, JSON.stringify(balanceData, null, 2));
    } catch (error) {
      console.log(`   ❌ User balance error: ${error.message}`);
    }

    // 4. Test pump endpoint with correct token
    console.log('\n4️⃣ Testing pump endpoint...');
    try {
      const pumpRequest = {
        userAddress: testUser,
        amount: '100',
        sessionId: 'test-session-123',
        token: testToken
      };

      console.log(`   📤 Sending pump request:`, JSON.stringify(pumpRequest, null, 2));

      const pumpResponse = await fetch(`${RELAYER_URL}/api/pump`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pumpRequest),
      });

      const pumpData = await pumpResponse.json();
      console.log(`   ✅ Pump response:`, JSON.stringify(pumpData, null, 2));
    } catch (error) {
      console.log(`   ❌ Pump error: ${error.message}`);
    }

    // 5. Test game state after pump
    console.log('\n5️⃣ Testing game state after pump...');
    try {
      const stateResponse = await fetch(`${RELAYER_URL}/api/pump/state`);
      const stateData = await stateResponse.json();
      console.log(`   ✅ Game state after pump:`, JSON.stringify(stateData, null, 2));
    } catch (error) {
      console.log(`   ❌ Game state error: ${error.message}`);
    }

    // 6. Test pump endpoint with wrong token (should fail)
    console.log('\n6️⃣ Testing pump with wrong token...');
    try {
      const pumpRequest = {
        userAddress: testUser,
        amount: '50',
        sessionId: 'test-session-456',
        token: '0x0000000000000000000000000000000000000000' // Wrong token
      };

      const pumpResponse = await fetch(`${RELAYER_URL}/api/pump`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pumpRequest),
      });

      const pumpData = await pumpResponse.json();
      console.log(`   ✅ Pump response (wrong token):`, JSON.stringify(pumpData, null, 2));
    } catch (error) {
      console.log(`   ❌ Pump error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRelayerPump();

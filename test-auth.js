#!/usr/bin/env node

// Test script for authentication endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testHealth() {
  console.log('🏥 Testing health endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ Health check passed:', data.services);
      return true;
    } else {
      console.log('❌ Health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testAuthChallenge() {
  console.log('🔐 Testing auth challenge endpoint...');
  try {
    const testWallet = '0x742d35Cc6E19c2E1a4E9c6b3D2F5A8E7B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4';

    const response = await fetch(`${BASE_URL}/api/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: testWallet })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Auth challenge created successfully');
      console.log('   Challenge ID:', data.challengeId);
      console.log('   Expires in:', data.expiresIn, 'seconds');
      return data;
    } else {
      console.log('❌ Auth challenge failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Auth challenge error:', error.message);
    return null;
  }
}

async function testUserProfile() {
  console.log('👤 Testing user profile endpoint...');
  try {
    const testWallet = '0x742d35Cc6E19c2E1a4E9c6b3D2F5A8E7B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4';

    const response = await fetch(`${BASE_URL}/api/user/${testWallet}`);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ User profile retrieved:');
      console.log('   Name:', data.playerName);
      console.log('   Tokens:', data.tokenBalance);
      console.log('   Games:', data.gameStats?.totalGames || 0);
      return data;
    } else if (response.status === 404) {
      console.log('ℹ️  User not found (expected for test wallet)');
      return null;
    } else {
      console.log('❌ User profile error:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ User profile error:', error.message);
    return null;
  }
}

async function testGameJoin() {
  console.log('🎮 Testing game join endpoint...');
  try {
    const testWallet = '0x742d35Cc6E19c2E1a4E9c6b3D2F5A8E7B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4';
    const testPlayerName = 'TestPlayer';

    const response = await fetch(`${BASE_URL}/api/game/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: testWallet,
        playerName: testPlayerName
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Game join successful:');
      console.log('   Session ID:', data.sessionId);
      console.log('   Player:', data.playerName);
      return data;
    } else {
      console.log('❌ Game join failed:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Game join error:', error.message);
    return null;
  }
}

async function main() {
  console.log('🧪 BNB Balloon Pump Authentication Test Suite');
  console.log('==========================================\n');

  // Check if server is running
  console.log('🔍 Checking if server is running...');
  const serverRunning = await testHealth();

  if (!serverRunning) {
    console.log('\n❌ Server is not running. Please start it with: npm run dev');
    process.exit(1);
  }

  console.log('');

  // Test authentication endpoints
  await testAuthChallenge();
  console.log('');

  await testUserProfile();
  console.log('');

  await testGameJoin();
  console.log('');

  console.log('🎉 Authentication test suite completed!');
  console.log('');
  console.log('💡 Tips:');
  console.log('   • For full authentication testing, use the frontend MetaMask integration');
  console.log('   • Real wallets will be automatically created with 1000 starting tokens');
  console.log('   • Session data persists in Supabase for cross-device play');
  console.log('');
  console.log('🚀 Ready for frontend testing!');
}

// Run the test suite
main().catch(error => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});

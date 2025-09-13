#!/usr/bin/env node

async function testPayoutEndpoint() {
  console.log('🎯 Testing Payout Percentages Endpoint\n');

  try {
    const relayerUrl = 'https://bnb-balloon-pump-production.up.railway.app';
    
    // Test the new payout percentages endpoint
    console.log('1️⃣ Testing payout percentages endpoint...');
    const response = await fetch(`${relayerUrl}/api/pump/payout-percentages`);
    
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('   Error details:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Payout percentages response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success && data.payoutPercentages) {
      console.log('\n🎉 Payout percentages are working!');
      console.log(`   Winner: ${data.payoutPercentages.winner}%`);
      console.log(`   Second: ${data.payoutPercentages.second}%`);
      console.log(`   Third: ${data.payoutPercentages.third}%`);
      console.log(`   Dev: ${data.payoutPercentages.dev}%`);
      console.log(`   Burn: ${data.payoutPercentages.burn}%`);
      console.log(`   Pressure: ${data.pressure}%`);
      console.log(`   First Pump: ${data.isFirstPump}`);
    } else {
      console.log('❌ Payout percentages not found in response');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPayoutEndpoint();

# 🎈 Supabase-Only Testing Guide

## 🎯 Overview

This guide helps you test and hone the "Don't Pop the Balloon" game mechanics using only Supabase, without any blockchain integration. Perfect for rapid iteration and testing!

## 🚀 Quick Setup

### 1. Apply Database Schema
```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d postgres -f setup-test-environment.sql
```

### 2. Run Test Script
```bash
# Install dependencies
npm install @supabase/supabase-js

# Run the test script
node test-supabase-only.js

# Run the automatic rounds demo
node demo-automatic-rounds.js
```

### 3. Open Web Interface
```bash
# Open the test interface in your browser
open test-game-interface.html
```

## 🎮 Test Interface Features

### Manual Testing
- **Select Users**: Choose from 5 test users with different vault balances
- **Pump Balloon**: Enter amount and pump the balloon
- **Real-time Stats**: See pressure, pot size, pop chance, and vault balance
- **Visual Balloon**: Balloon grows as pressure increases
- **Activity Log**: See all actions and results in real-time
- **Automatic Rounds**: New rounds are created automatically when balloons pop

### Automated Testing
- **Pop Chance Tests**: Test different pop chance percentages
- **Game Simulation**: Run multiple rounds automatically
- **Statistics**: View comprehensive game statistics
- **Round Management**: Game automatically handles round progression

## 🔧 Configuration Options

### Pop Chance Settings
You can adjust the pop chance in the database:
```sql
-- Conservative (1-3% chance)
UPDATE rounds_cache SET pop_chance = 200 WHERE round_id = '1';

-- Moderate (5-8% chance) 
UPDATE rounds_cache SET pop_chance = 500 WHERE round_id = '1';

-- Aggressive (10-20% chance)
UPDATE rounds_cache SET pop_chance = 1500 WHERE round_id = '1';

-- Extreme (30%+ chance)
UPDATE rounds_cache SET pop_chance = 3000 WHERE round_id = '1';
```

### Test Users
The system comes with 5 test users:
- **User 1**: 5000 tokens
- **User 2**: 3000 tokens  
- **User 3**: 2000 tokens
- **User 4**: 1000 tokens
- **User 5**: 500 tokens

### Payout Structure
Current payout structure (80/10/5/2.5/2.5):
- Winner (Last Pumper): 80%
- Second to Last: 10%
- Third to Last: 5%
- Developer Fee: 2.5%
- Token Burn: 2.5%

## 📊 Testing Scenarios

### 1. Basic Functionality
- Pump balloon with different amounts
- Verify vault balance deduction
- Check pressure and pot increases
- Test random popping mechanics

### 2. Payout Distribution
- Trigger balloon pop
- Verify winner gets 80% of pot
- Check second gets 10% of pot
- Confirm third gets 5% of pot
- Verify dev and burn amounts

### 3. Pop Chance Testing
- Test different pop chance percentages
- Run multiple rounds to see actual vs expected rates
- Adjust pop chances based on results

### 4. Automatic Round Progression
- **No Manual Resets**: Game automatically creates new rounds when balloons pop
- **Seamless Flow**: Players can continue pumping immediately after a pop
- **Round Tracking**: Each round gets a unique ID that increments automatically
- **State Management**: Pressure and pot reset to 0 for each new round
- **Continuous Play**: Game runs indefinitely without intervention

### 5. Game Balance
- Test with different pump amounts
- Verify game doesn't get stuck
- Check automatic round progression
- Test multiple users pumping

## 🎯 Key Metrics to Monitor

### Game Mechanics
- **Pop Rate**: How often balloons actually pop vs expected
- **Average Pumps**: How many pumps before pop
- **Pressure Distribution**: Range of pressure values
- **Pot Growth**: How pot size increases over time

### Payout Distribution
- **Winner Payouts**: Verify 80% goes to last pumper
- **Second Payouts**: Verify 10% goes to second
- **Third Payouts**: Verify 5% goes to third
- **Dev/Burn**: Verify 2.5% each for dev and burn

### User Experience
- **Vault Balances**: Users should have enough tokens
- **Game Flow**: Smooth transitions between rounds
- **Visual Feedback**: Balloon grows appropriately
- **Error Handling**: Graceful handling of edge cases

## 🔧 Customization

### Adjust Payout Percentages
Edit the `simulate_pump_hybrid` function in the database:
```sql
-- Change from 80/10/5/2.5/2.5 to 70/15/10/3/2
winner_amount := new_pot * 0.7;   -- 70%
second_amount := new_pot * 0.15;  -- 15%
third_amount := new_pot * 0.1;    -- 10%
dev_amount := new_pot * 0.03;     -- 3%
burn_amount := new_pot * 0.02;    -- 2%
```

### Add More Test Users
```sql
INSERT INTO profiles (evm_address, test_tokens) VALUES
  ('0x6666666666666666666666666666666666666666', '10000'),
  ('0x7777777777777777777777777777777777777777', '7500');
```

### Modify Pop Logic
Edit the pop chance calculation in `simulate_pump_hybrid`:
```sql
-- Make pop chance increase with pressure
pop_chance := 500 + (new_pressure::INTEGER / 10); -- Base 5% + pressure/10
```

## 📈 Performance Testing

### Load Testing
```javascript
// Test multiple concurrent pumps
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(supabase.rpc('manual_pump', {
    user_address: testUsers[i % testUsers.length],
    pump_amount: '100'
  }));
}
await Promise.all(promises);
```

### Long-running Tests
```javascript
// Run for extended periods
const { data } = await supabase.rpc('test_game_mechanics', { 
  rounds_to_test: 100 
});
```

## 🐛 Troubleshooting

### Common Issues

1. **"No active round" error**
   - Solution: Run `resetGame()` or check rounds_cache table

2. **"Insufficient vault balance" error**
   - Solution: Check user's test_tokens in profiles table

3. **Pop chance not working**
   - Solution: Verify pop_chance column exists and has valid values

4. **Payouts not distributing**
   - Solution: Check payout_distributions table and simulate_pump_hybrid function

### Debug Queries
```sql
-- Check current round status
SELECT * FROM rounds_cache WHERE status = 'active';

-- Check user vault balances
SELECT evm_address, test_tokens FROM profiles ORDER BY test_tokens DESC;

-- Check recent payouts
SELECT * FROM payout_distributions ORDER BY created_at DESC LIMIT 5;

-- Check recent pumps
SELECT * FROM pumps ORDER BY requested_at DESC LIMIT 10;
```

## 🎉 Success Criteria

Your testing is successful when:

✅ **Random Popping Works** - Balloons pop unpredictably based on chance  
✅ **Payouts Distributed Correctly** - 80/10/5/2.5/2.5 structure working  
✅ **Vault Balances Update** - Tokens deducted and awarded properly  
✅ **Game Flow Smooth** - Rounds reset and continue properly  
✅ **UI Responsive** - Test interface shows real-time updates  
✅ **Statistics Accurate** - All metrics reflect actual game state  

## 🚀 Next Steps

Once you're happy with the game mechanics:

1. **Deploy Smart Contract** - Move to blockchain integration
2. **Update Relayer** - Enable hybrid mode
3. **Deploy Frontend** - Go live with real users
4. **Monitor Metrics** - Track real-world performance

**Happy Testing! 🎈💰**

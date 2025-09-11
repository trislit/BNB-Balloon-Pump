# 🎈 Don't Pop the Balloon - BNB Integration Guide

## 🎯 Overview

This guide covers the integration of "Don't Pop the Balloon" game mechanics into the BNB Balloon Pump game, featuring:

- **Vault-based token system** - Players must deposit tokens to participate
- **Random balloon popping** - Balloons can pop at any time based on chance
- **New payout structure** - 80%/10%/5%/2.5%/2.5% distribution
- **Enhanced risk/reward mechanics** - Higher stakes, bigger rewards

## 🚀 New Features

### 1. Vault System
- Players deposit tokens into personal vaults
- Each pump deducts tokens from vault
- Vault balance displayed prominently in UI
- Deposit/withdraw functionality

### 2. Random Balloon Popping
- Balloons can pop randomly (configurable chance)
- No guaranteed threshold - pure risk/reward
- Creates excitement and unpredictability
- Configurable pop chance per round

### 3. New Payout Structure
- **🥇 Winner (Last Pumper): 80%** of pot
- **🥈 Second to Last: 10%** of pot  
- **🥉 Third to Last: 5%** of pot
- **👨‍💻 Developer Fee: 2.5%** of pot
- **🔥 Token Burn: 2.5%** of pot

## 📋 Implementation Details

### Smart Contract Updates

#### New Round Structure
```solidity
struct Round {
    uint256 id;
    uint256 pot;
    uint256 pressure;
    uint256 threshold;       // Still exists for guaranteed pop
    uint256 popChance;       // NEW: Random pop chance (0-10000)
    uint64 openedAt;
    uint64 poppedAt;
    address[3] lastThree;
    bool settled;
    bool open;
}
```

#### Updated Payout Function
```solidity
function _distributeRewards(address token, uint256 totalPot, address[3] memory lastThree) internal {
    uint256 winnerAmount = (totalPot * 8000) / 10000; // 80%
    uint256 secondAmount = (totalPot * 1000) / 10000; // 10%
    uint256 thirdAmount = (totalPot * 500) / 10000;   // 5%
    uint256 devAmount = (totalPot * 250) / 10000;     // 2.5%
    uint256 burnAmount = (totalPot * 250) / 10000;    // 2.5%
    // ... distribution logic
}
```

#### Random Pop Logic
```solidity
function _shouldPopBalloon(Round storage round) internal view returns (bool) {
    if (round.popChance == 0) return false;
    
    uint256 random = uint256(keccak256(abi.encodePacked(
        block.timestamp,
        block.difficulty,
        blockhash(block.number - 1),
        seed,
        round.pressure
    )));
    
    return (random % 10000) < round.popChance;
}
```

### Database Schema Updates

#### New Tables
```sql
-- Track detailed payout distributions
CREATE TABLE payout_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id TEXT NOT NULL,
  winner_address TEXT,
  second_address TEXT,
  third_address TEXT,
  winner_amount TEXT NOT NULL DEFAULT '0',
  second_amount TEXT NOT NULL DEFAULT '0',
  third_amount TEXT NOT NULL DEFAULT '0',
  dev_amount TEXT NOT NULL DEFAULT '0',
  burn_amount TEXT NOT NULL DEFAULT '0',
  total_pot TEXT NOT NULL,
  distribution_tx TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track vault balances per token
CREATE TABLE vault_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token_address TEXT NOT NULL,
  balance TEXT NOT NULL DEFAULT '0',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token_address)
);
```

#### Updated Functions
- `simulate_pump_hybrid()` - Handles new payout structure
- `get_vault_balance()` - Get user vault balance
- `update_vault_balance()` - Update vault balance
- `get_payout_history()` - Get user payout history

### Frontend Updates

#### VaultPanel Component
- Shows new payout structure (80/10/5/2.5/2.5)
- Displays vault balance prominently
- Enhanced deposit/withdraw messaging

#### PumpControls Component
- Updated to show "from vault" messaging
- Warning about random balloon popping
- Clear indication of token deduction

#### GameStats Component
- Added payout structure display
- Updated balance label to "Your Vault"
- Enhanced risk indicators

## 🚀 Deployment Steps

### 1. Database Setup
```bash
# Apply the new schema updates
psql -h your-supabase-host -U postgres -d postgres -f update-payout-schema.sql
```

### 2. Smart Contract Deployment
```bash
cd packages/contracts

# Deploy with new payout structure
npx hardhat run scripts/deploy.ts --network bnbTestnet

# Set up new round with pop chance
# Example: 5% pop chance (500 out of 10000)
await balloonPump.openRound(ethers.utils.parseEther("10000"), 500);
```

### 3. Relayer Service Update
```bash
cd apps/relayer

# Update environment variables
cp env.example .env
# Set TEST_MODE=true for testing

# Deploy to Railway
railway up
```

### 4. Frontend Deployment
```bash
cd apps/web

# Update environment variables in Vercel
# NEXT_PUBLIC_RELAYER_URL=https://your-relayer.railway.app

# Deploy to Vercel
vercel --prod
```

## 🎮 Game Flow

### 1. Player Joins
1. Connect MetaMask wallet
2. Deposit tokens to vault
3. Vault balance displayed

### 2. Pumping Phase
1. Player clicks "Pump Balloon"
2. Tokens deducted from vault
3. Pressure increases
4. Pot grows
5. Random chance check for pop

### 3. Balloon Pops
1. Random pop or threshold reached
2. Last 3 pumpers identified
3. Payouts distributed:
   - Winner: 80%
   - Second: 10%
   - Third: 5%
   - Dev: 2.5%
   - Burn: 2.5%
4. New round starts

## ⚙️ Configuration

### Pop Chance Settings
- **Conservative**: 100-300 (1-3% chance)
- **Moderate**: 500-800 (5-8% chance)
- **Aggressive**: 1000-2000 (10-20% chance)
- **Extreme**: 3000+ (30%+ chance)

### Round Thresholds
- **Low Risk**: 1000+ tokens
- **Medium Risk**: 500-1000 tokens
- **High Risk**: 100-500 tokens
- **Extreme Risk**: 50-100 tokens

## 🔧 Testing

### Test Mode
```bash
# Set TEST_MODE=true in relayer
# Uses Supabase-only simulation
# No blockchain transactions
# Instant responses
```

### Production Mode
```bash
# Set TEST_MODE=false in relayer
# Uses hybrid mode
# Optimistic updates + blockchain confirmation
# Real token economics
```

## 📊 Monitoring

### Key Metrics
- **Vault Deposits**: Total tokens deposited
- **Pump Volume**: Tokens pumped per round
- **Pop Frequency**: How often balloons pop
- **Payout Distribution**: Winner/second/third ratios
- **User Retention**: Players returning after pop

### Database Queries
```sql
-- Get recent payout distributions
SELECT * FROM payout_distributions 
ORDER BY created_at DESC LIMIT 10;

-- Get user vault balances
SELECT user_id, token_address, balance 
FROM vault_balances 
ORDER BY balance DESC;

-- Get pop frequency
SELECT 
  DATE(created_at) as date,
  COUNT(*) as pops
FROM payout_distributions 
GROUP BY DATE(created_at);
```

## 🎯 Benefits

### For Players
- **Higher Rewards**: 80% winner payout vs previous 50%
- **More Excitement**: Random popping creates suspense
- **Clear Economics**: Vault system makes costs transparent
- **Fair Distribution**: Multiple winners per round

### For Platform
- **Token Burn**: 2.5% deflationary pressure
- **Developer Revenue**: 2.5% sustainable income
- **Higher Engagement**: Risk/reward mechanics
- **Scalable**: Works with any ERC20 token

## 🚨 Risk Management

### Smart Contract Safety
- Reentrancy protection
- Access controls
- Emergency pause functionality
- Input validation

### Economic Safety
- Maximum pump limits
- Round spending limits
- Vault balance checks
- Payout verification

### User Safety
- Clear UI warnings
- Balance displays
- Transaction confirmations
- Error handling

## 🔮 Future Enhancements

### Planned Features
- **Multiple Tokens**: Support different ERC20 tokens
- **Tournament Mode**: Multi-round competitions
- **NFT Rewards**: Special prizes for winners
- **Social Features**: Team competitions
- **Mobile App**: Native mobile experience

### Technical Improvements
- **Gas Optimization**: Reduce transaction costs
- **Layer 2**: Move to Polygon/Arbitrum
- **Cross-chain**: Support multiple blockchains
- **AI Integration**: Dynamic difficulty adjustment

---

## 🎉 Success Metrics

Your integration is successful when:

✅ **Vault System Working** - Players can deposit/withdraw tokens  
✅ **Random Popping Active** - Balloons pop unpredictably  
✅ **Payouts Distributed** - 80/10/5/2.5/2.5 structure working  
✅ **UI Updated** - Clear vault balance and payout info  
✅ **Database Tracking** - All transactions recorded  
✅ **User Engagement** - Players actively pumping and winning  

**The Don't Pop the Balloon mechanics are now fully integrated into your BNB Balloon Pump game! 🎈💰**

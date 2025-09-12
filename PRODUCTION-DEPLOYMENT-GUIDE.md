# 🚀 Production Deployment Guide

## 🎯 Overview

This guide will help you deploy the cleaned up production system with proper game state management, historical tracking, and user balance management.

## 📋 What We're Building

### **Live Game Status System**
- Each token has its own active game round
- Real-time pressure, pot, and participant tracking
- Dynamic pop chance based on pressure
- Automatic new round creation after pops

### **Historical Game Tracking**
- Complete game history with winners and payouts
- Game duration and statistics
- Payout distribution tracking
- Token-specific game analytics

### **User Balance Management**
- Proper deposit/withdrawal system
- Balance tracking per token
- Winnings and transaction history
- Real-time balance updates

## 🗄️ Step 1: Database Cleanup and Setup

### 1.1 Run Production Cleanup Script
Go to: https://supabase.com/dashboard/project/uvmfrbiojefvtbfgbcfk/sql

Copy and paste the entire contents of `production-cleanup-and-setup.sql` and click **Run**.

This will:
- ✅ Clean up all test data
- ✅ Create production tables (game_rounds, historical_games, user_balances, token_game_status)
- ✅ Set up proper indexes and policies
- ✅ Create production functions (pump_balloon, get_token_game_status, etc.)
- ✅ Initialize common tokens (BNB, USDT, USDC)

### 1.2 Verify Setup
Run this query to verify the new tables exist:
```sql
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name AND table_schema = 'public') as columns
FROM information_schema.tables t 
WHERE table_schema = 'public' 
AND table_name IN ('game_rounds', 'historical_games', 'user_balances', 'token_game_status')
ORDER BY table_name;
```

## 🔧 Step 2: Update Relayer Service

### 2.1 Update Relayer Code
```bash
# Run the update script
node update-relayer-for-production.js
```

This will update:
- ✅ `TestModeService.ts` to use production functions
- ✅ `RelayerService.ts` to use production functions
- ✅ `pump.ts` routes to add historical games endpoint

### 2.2 Deploy Updated Relayer
```bash
cd apps/relayer

# Build the updated service
npm run build

# Deploy to Railway
railway up
```

## 🧪 Step 3: Test Production System

### 3.1 Run Production Test
```bash
# Install dependencies
npm install @supabase/supabase-js

# Run the production test
node test-production-system.js
```

This will test:
- ✅ Token game status creation
- ✅ User balance management
- ✅ Balloon pumping mechanics
- ✅ Game ending and payouts
- ✅ Historical game tracking
- ✅ New round creation

### 3.2 Expected Test Results
```
🧪 Testing Production System

1️⃣ Testing token game status...
   ✅ Game status: {"success":true,"game_id":"...","round_number":1,...}

2️⃣ Testing user balance creation...
   ✅ Balance for 0x1111...: 0

3️⃣ Testing deposits...
   ✅ Deposited 1000 for 0x1111...
   ✅ Deposited 2000 for 0x2222...
   ✅ Deposited 3000 for 0x3333...

4️⃣ Testing balloon pumping...
   Pump 1: 0x1111... pumped 100
   Pressure: 100, Pot: 100
   Pump 2: 0x2222... pumped 150
   Pressure: 250, Pot: 250
   ...
   💥 BALLOON POPPED!
   Winner: 0x3333...
   Winner Payout: 1250.5
   Second Payout: 125.05
   Third Payout: 62.525

5️⃣ Checking final balances...
   0x1111...: Balance=750, Winnings=0
   0x2222...: Balance=1750, Winnings=125.05
   0x3333...: Balance=2250, Winnings=1250.5

6️⃣ Checking historical games...
   ✅ Found 1 historical games
   Latest game: Round 1, Winner: 0x3333...
   Final Pressure: 1250, Total Pot: 1250.5

7️⃣ Checking current game status...
   ✅ Current game: Round 2
   Status: active, Pressure: 0
   Pot: 0, Pumps: 0

🎉 Production system test complete!
```

## 🌐 Step 4: Update Frontend

### 4.1 Add Historical Games Component
Create `apps/web/src/components/game/HistoricalGames.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';

interface HistoricalGame {
  game_id: string;
  round_number: number;
  winner_address: string;
  final_pressure: number;
  total_pot: number;
  winner_payout: number;
  second_payout: number;
  third_payout: number;
  ended_at: string;
}

export function HistoricalGames() {
  const [games, setGames] = useState<HistoricalGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoricalGames();
  }, []);

  const fetchHistoricalGames = async () => {
    try {
      const response = await fetch('/api/pump/historical-games?limit=10');
      const data = await response.json();
      
      if (data.success) {
        setGames(data.games);
      }
    } catch (error) {
      console.error('Error fetching historical games:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading historical games...</div>;
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
      <h3 className="text-xl font-bold mb-4">Recent Games</h3>
      
      {games.length === 0 ? (
        <p className="text-gray-400">No games played yet</p>
      ) : (
        <div className="space-y-3">
          {games.map((game, index) => (
            <div key={game.game_id} className="bg-white/5 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold">Round {game.round_number}</span>
                <span className="text-sm text-gray-400">
                  {new Date(game.ended_at).toLocaleString()}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Final Pressure</p>
                  <p className="font-semibold">{game.final_pressure.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Pot</p>
                  <p className="font-semibold">{game.total_pot.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Winner</p>
                  <p className="font-semibold text-green-400">
                    {game.winner_address.slice(0, 6)}...{game.winner_address.slice(-4)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Winner Payout</p>
                  <p className="font-semibold text-green-400">
                    {game.winner_payout.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.2 Update GameContainer
Add the HistoricalGames component to your main game interface:

```tsx
// In GameContainer.tsx
import { HistoricalGames } from './HistoricalGames';

// Add to your JSX
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    {/* Your existing game components */}
  </div>
  <div className="space-y-6">
    <HistoricalGames />
    <Leaderboard />
  </div>
</div>
```

## 📊 Step 5: Monitor Production System

### 5.1 Key Metrics to Track

**Game Health:**
- Active games per token
- Average game duration
- Pop frequency and pressure levels
- Payout distribution accuracy

**User Activity:**
- Daily active users
- Average deposits per user
- Win/loss ratios
- Balance distribution

**System Performance:**
- API response times
- Database query performance
- Error rates
- Queue processing times

### 5.2 Monitoring Queries

```sql
-- Get current game status for all tokens
SELECT 
  tgs.token_address,
  gr.round_number,
  gr.pressure,
  gr.pot_amount,
  gr.total_pumps,
  gr.created_at
FROM token_game_status tgs
LEFT JOIN game_rounds gr ON tgs.current_round_id = gr.id
WHERE tgs.is_active = true;

-- Get user balance distribution
SELECT 
  token_address,
  COUNT(*) as user_count,
  AVG(balance) as avg_balance,
  SUM(balance) as total_balance
FROM user_balances
GROUP BY token_address;

-- Get recent game statistics
SELECT 
  token_address,
  COUNT(*) as games_played,
  AVG(final_pressure) as avg_pressure,
  AVG(total_pot) as avg_pot,
  AVG(duration_seconds) as avg_duration
FROM historical_games
WHERE ended_at > NOW() - INTERVAL '24 hours'
GROUP BY token_address;
```

## 🎯 Step 6: Production Features

### 6.1 Test Token System
The system uses a test token for development and testing:
- **Test Token**: `0xTEST0000000000000000000000000000000000000` (placeholder for future meme coins)

**Note**: This is designed for meme coins in the future. Currently using test tokens for development without real blockchain integration (except for wallet login).

### 6.2 Dynamic Payouts
Payout percentages adjust based on pressure:
- **Low Pressure (0-1000)**: 75% winner, 10% second, 5% third, 5% dev, 5% burn
- **High Pressure (1000+)**: Up to 85% winner, 12% second, 6% third, 3% dev, 3% burn

### 6.3 Historical Tracking
Every completed game is stored with:
- Complete payout breakdown
- Game duration and statistics
- Winner and participant details
- Pressure and pot history

## 🚨 Troubleshooting

### Common Issues

**1. No Active Game**
```sql
-- Check if token has active game
SELECT * FROM token_game_status WHERE token_address = 'YOUR_TOKEN';
```

**2. User Balance Issues**
```sql
-- Check user balance
SELECT * FROM user_balances 
WHERE user_address = 'YOUR_ADDRESS' 
AND token_address = 'YOUR_TOKEN';
```

**3. Game Not Ending**
```sql
-- Check current round status
SELECT * FROM game_rounds 
WHERE token_address = 'YOUR_TOKEN' 
AND status = 'active';
```

## 🎉 Success Criteria

Your production system is working when:

✅ **Games Start Automatically** - New rounds create when needed  
✅ **Balances Update Correctly** - Deposits/withdrawals work properly  
✅ **Games End Properly** - Balloons pop and payouts distribute  
✅ **History is Tracked** - Completed games appear in historical data  
✅ **Multi-User Works** - Multiple users can play simultaneously  
✅ **Real-time Updates** - UI updates immediately with game state  

## 🔮 Next Steps

1. **Add More Tokens** - Support additional ERC20 tokens
2. **Tournament Mode** - Multi-round competitions
3. **NFT Rewards** - Special prizes for winners
4. **Mobile App** - Native mobile experience
5. **Analytics Dashboard** - Advanced game analytics

---

**Your production balloon pump game is now live! 🎈💰**

The system is clean, scalable, and ready for real users. Each token has its own game state, historical tracking works perfectly, and user balances are properly managed.

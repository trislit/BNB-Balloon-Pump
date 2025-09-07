# 🚀 BNB Balloon Pump - Hybrid Architecture Deployment

## 🎯 Overview

Deploy the ultimate balloon pump game with **hybrid architecture**:
- ⚡ **Instant UI Updates** via Supabase optimistic updates
- ⛓️ **Blockchain Finality** via BNB Smart Chain transactions  
- 🔄 **Real-time Sync** via blockchain event indexing
- 🎮 **Seamless UX** - No waiting for blockchain confirmations

## 📋 Architecture Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Relayer      │    │    Indexer      │
│   (Next.js)     │◄──►│  (Optimistic)   │    │  (Event Sync)   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Smart Contract │
                    │  (BNB Chain)    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Supabase DB   │
                    │ (Optimistic +   │
                    │  Confirmed)     │
                    └─────────────────┘
```

## 🎮 User Experience Flow

1. **User clicks "Pump"** → Frontend sends request to Relayer
2. **Instant Response** → Relayer updates Supabase immediately (optimistic)
3. **UI Updates** → User sees balloon grow instantly
4. **Blockchain Transaction** → Relayer submits to BNB Chain (async)
5. **Event Indexing** → Indexer confirms transaction and syncs final state
6. **Reconciliation** → Any discrepancies are resolved automatically

---

## 🗄️ Step 1: Database Setup (Supabase)

### 1.1 Deploy Hybrid Schema
Go to: https://supabase.com/dashboard/project/uvmfrbiojefvtbfgbcfk/sql

Copy and paste the entire contents of `setup-hybrid-schema.sql` and click **Run**.

This creates:
- ✅ **Hybrid tables** supporting both test and production modes
- ✅ **Indexer state** tracking for blockchain sync
- ✅ **Optimistic update** functions for instant UI
- ✅ **Event reconciliation** for blockchain confirmation

### 1.2 Verify Setup
Run this query to verify:
```sql
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name AND table_schema = 'public') as columns
FROM information_schema.tables t 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'pumps', 'rounds_cache', 'deposits', 'leaderboard', 'indexer_state')
ORDER BY table_name;
```

---

## ⛓️ Step 2: Smart Contract Deployment

### 2.1 Deploy to BNB Testnet
```bash
cd packages/contracts
npm install
npm run compile

# Add your deployment private key
echo "PRIVATE_KEY=0xYOUR_PRIVATE_KEY" > .env

# Deploy to BNB testnet
npm run deploy:testnet
```

### 2.2 Save Contract Address
Copy the deployed contract address - you'll need it for the relayer and indexer.

---

## 🚂 Step 3: Relayer Service (Railway)

### 3.1 Deploy Relayer
1. Go to [Railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Select `BNB-Balloon-Pump` → Root: `apps/relayer`

### 3.2 Environment Variables
```bash
# Mode Configuration
NODE_ENV=production
PORT=3001
TEST_MODE=false  # HYBRID MODE ENABLED

# Supabase Configuration  
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Blockchain Configuration
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
RELAYER_PRIVATE_KEY=0xYOUR_RELAYER_PRIVATE_KEY
CHAIN_ID=97

# Performance Settings
MAX_TX_PER_MINUTE_PER_USER=10
QUEUE_PROCESS_INTERVAL_MS=1000
```

### 3.3 Test Relayer Health
Visit: `https://your-railway-app.railway.app/health`

Should return:
```json
{
  "status": "healthy",
  "mode": "hybrid",
  "message": "Running in hybrid mode: Supabase + BNB blockchain",
  "blockNumber": 12345678,
  "relayerBalance": "1.5"
}
```

---

## 🔍 Step 4: Indexer Service (Railway)

### 4.1 Deploy Indexer
1. **Railway → New Service**
2. **Deploy from GitHub repo**
3. Select `BNB-Balloon-Pump` → Root: `apps/indexer`

### 4.2 Environment Variables
```bash
# Service Configuration
NODE_ENV=production
LOG_LEVEL=info

# Blockchain Configuration
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
CHAIN_ID=97

# Supabase Configuration
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Indexer Settings
SYNC_INTERVAL_MS=10000
BATCH_SIZE=1000
```

### 4.3 Verify Indexer
The indexer will automatically:
- ✅ Start syncing from recent blocks
- ✅ Listen for new blockchain events
- ✅ Update Supabase with confirmed transactions
- ✅ Reconcile optimistic updates with blockchain reality

---

## 🌐 Step 5: Frontend Deployment (Vercel)

### 5.1 Deploy Frontend
1. Go to [Vercel.com](https://vercel.com)
2. **New Project → Import Git Repository**
3. Select `BNB-Balloon-Pump` → Root: `apps/web`

### 5.2 Environment Variables
```bash
# NextAuth Configuration
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-super-secret-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

# Services
NEXT_PUBLIC_RELAYER_URL=https://your-relayer.railway.app
```

---

## 🎮 Step 6: Test Complete Flow

### 6.1 Optimistic Updates Test
1. **Connect MetaMask** → Sign SIWE message
2. **Pump Balloon** → Should update instantly (optimistic)
3. **Check Database** → `pumps` table shows `status: 'optimistic'`
4. **Wait 10-30 seconds** → Status changes to `confirmed`
5. **Verify Blockchain** → Transaction appears on BNB testnet

### 6.2 Real-time Sync Test
1. **Make transaction** directly on blockchain (via MetaMask)
2. **Watch Indexer logs** → Should detect and process event
3. **Check Supabase** → Database updates with blockchain data
4. **Frontend Updates** → UI reflects blockchain state

---

## 🔧 Step 7: Mode Switching

### 7.1 Test Mode (No Blockchain)
```bash
# Relayer environment
TEST_MODE=true
```
- ✅ Pure Supabase simulation
- ✅ Instant responses
- ✅ No gas fees
- ✅ Perfect for development

### 7.2 Hybrid Mode (Production)
```bash
# Relayer environment  
TEST_MODE=false
```
- ✅ Optimistic Supabase updates
- ✅ Real BNB blockchain transactions
- ✅ Event indexing and reconciliation
- ✅ Best user experience

---

## 📊 Step 8: Monitoring & Analytics

### 8.1 Key Metrics to Track

**Relayer Service:**
- Optimistic update success rate
- Blockchain confirmation rate
- Average confirmation time
- Queue depth and processing time

**Indexer Service:**
- Blocks behind current
- Event processing rate
- Sync health status
- Reconciliation accuracy

**Database:**
- Optimistic vs confirmed transaction ratio
- User experience latency
- Real-time subscription performance

### 8.2 Monitoring Endpoints

- **Relayer Health**: `https://your-relayer.railway.app/health`
- **Queue Status**: `https://your-relayer.railway.app/api/queue/status`
- **Indexer Health**: `https://your-indexer.railway.app/health` (if you add health endpoint)

---

## 🚨 Troubleshooting

### Common Issues

**1. Optimistic Updates Not Working**
```bash
# Check relayer logs
railway logs --service relayer

# Verify Supabase connection
# Check TEST_MODE setting
```

**2. Blockchain Confirmations Failing**
```bash
# Check RPC connection
# Verify contract address
# Ensure relayer has BNB for gas
```

**3. Indexer Not Syncing**
```bash
# Check indexer logs
railway logs --service indexer

# Verify contract events are being emitted
# Check RPC rate limits
```

**4. Frontend Not Updating**
```bash
# Check browser console for errors
# Verify WebSocket connections to Supabase
# Test relayer API endpoints directly
```

---

## 🎉 Success Metrics

Your hybrid deployment is successful when:

✅ **Instant UI Response** - Balloon grows immediately on pump  
✅ **Blockchain Confirmation** - Transactions appear on BNB testnet  
✅ **Event Sync** - Indexer processes blockchain events  
✅ **Data Consistency** - Supabase matches blockchain state  
✅ **Real-time Updates** - Multiple users see changes instantly  
✅ **Graceful Fallback** - Works even if blockchain is slow  

---

## 🔮 Advanced Features

### Optimistic Rollback
If blockchain transaction fails, optimistic updates are automatically rolled back.

### Event Reconciliation  
Indexer continuously reconciles Supabase state with blockchain reality.

### Multi-User Real-time
Supabase real-time subscriptions keep all users in sync.

### Performance Optimization
- Database connection pooling
- RPC request batching
- Optimistic update caching
- Event processing queues

---

## 🚀 Production Deployment

When ready for mainnet:

1. **Deploy contract** to BNB mainnet (`CHAIN_ID=56`)
2. **Update RPC URLs** to mainnet endpoints
3. **Switch relayer** to mainnet configuration
4. **Update indexer** to mainnet contract
5. **Test thoroughly** with small amounts first

**Your hybrid BNB Balloon Pump game is now live with the best of both worlds! 🎈💰**

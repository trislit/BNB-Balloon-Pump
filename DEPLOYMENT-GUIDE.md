# 🚀 BNB Balloon Pump - Complete Deployment Guide

## 🎯 Overview

Deploy a fully functional balloon pump game with:
- **Frontend**: Next.js with MetaMask/WAGMI authentication
- **Backend**: Railway relayer service 
- **Database**: Supabase with test token tracking
- **Auth**: Sign-In With Ethereum (SIWE) as primary method

## 📋 Prerequisites

- Supabase account (free tier works)
- Railway account (free tier works) 
- Vercel account (free tier works)
- MetaMask wallet

---

## 🗄️ Step 1: Database Setup (Supabase)

### 1.1 Access Your Supabase Project
Go to: https://supabase.com/dashboard/project/uvmfrbiojefvtbfgbcfk/sql

### 1.2 Deploy Database Schema
Copy and paste the entire contents of `setup-test-mode.sql` into the SQL Editor and click **Run**.

This creates:
- ✅ `profiles` - User authentication with test token balances
- ✅ `token_transactions` - Transaction history
- ✅ `test_pumps` - Pump actions simulation
- ✅ `rounds_cache` - Real-time game state
- ✅ `leaderboard` - Player rankings
- ✅ Database functions for game mechanics

### 1.3 Get Your Service Key
1. Go to **Settings → API**
2. Copy the `service_role` key (keep this secure!)

---

## 🚂 Step 2: Railway Relayer Deployment

### 2.1 Connect Repository to Railway
1. Go to [Railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Select your `BNB-Balloon-Pump` repository
4. Choose **apps/relayer** as the root directory

### 2.2 Configure Environment Variables
In Railway project settings, add these variables:

```bash
# Service Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
TEST_MODE=true

# Supabase Configuration
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM
SUPABASE_SERVICE_KEY=your-service-key-from-step-1.3

# Relayer Settings
MAX_TX_PER_MINUTE_PER_USER=10
MAX_PENDING_TX=100
QUEUE_PROCESS_INTERVAL_MS=1000
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY_MS=5000

# Security Settings
CORS_ORIGINS=https://your-frontend-url.vercel.app,http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
HEALTH_CHECK_INTERVAL_MS=30000
```

### 2.3 Deploy
Railway will automatically build and deploy. Get your Railway URL from the deployment.

### 2.4 Test Relayer Health
Visit: `https://your-railway-app.railway.app/health`

Should return:
```json
{
  "status": "healthy",
  "mode": "test",
  "message": "Running in test mode with Supabase-only token tracking"
}
```

---

## 🌐 Step 3: Frontend Deployment (Vercel)

### 3.1 Connect Repository to Vercel
1. Go to [Vercel.com](https://vercel.com)
2. **New Project → Import Git Repository**
3. Select your `BNB-Balloon-Pump` repository
4. Set **Root Directory** to `apps/web`

### 3.2 Configure Environment Variables
In Vercel project settings, add:

```bash
# NextAuth Configuration
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-generate-with-openssl-rand-base64-32

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM

# Blockchain Configuration (for future BNB integration)
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Relayer Service
NEXT_PUBLIC_RELAYER_URL=https://your-railway-app.railway.app

# WalletConnect (optional)
NEXT_PUBLIC_WC_PROJECT_ID=your-walletconnect-project-id
```

### 3.3 Deploy
Vercel will automatically build and deploy your Next.js app.

### 3.4 Update CORS in Railway
Go back to Railway and update the `CORS_ORIGINS` variable to include your Vercel URL.

---

## 🎮 Step 4: Test Complete Game Flow

### 4.1 Visit Your App
Go to your Vercel URL: `https://your-app.vercel.app`

### 4.2 Authentication Flow
1. **Connect Wallet** - Click "Connect MetaMask"
2. **Sign Message** - Sign the SIWE message to authenticate
3. **Access Game** - You should see the game interface

### 4.3 Game Mechanics Test
1. **Check Balance** - Should show 1000 test tokens
2. **Pump Balloon** - Try pumping with different amounts
3. **Watch Pressure** - See pressure increase in real-time
4. **Balloon Pop** - Keep pumping until it pops (>100 pressure)
5. **Rewards** - Winner gets 85% of pot
6. **Leaderboard** - Check rankings update

### 4.4 Verify Backend
Check Railway logs to see:
- User creation: `✅ Created test user: 0x... with 1000 test tokens`
- Pump actions: `✅ Pump simulated: 0x... -10 tokens`
- Database updates in real-time

---

## 🔧 Step 5: Configuration & Customization

### 5.1 Game Parameters (in database functions)
- **Pop Threshold**: Currently 100 pressure
- **Pot Contribution**: 10% of pump amount
- **Winner Reward**: 85% of pot
- **Starting Tokens**: 1000 per user

### 5.2 Rate Limiting
- **Max Pumps**: 10 per minute per user
- **Max Pending**: 100 transactions in queue

### 5.3 Monitoring
- **Railway**: Built-in monitoring and logs
- **Vercel**: Analytics and performance metrics
- **Supabase**: Database metrics and real-time usage

---

## 🚀 Step 6: Future BNB Blockchain Integration

When ready to add real BNB transactions:

### 6.1 Deploy Smart Contract
```bash
# Set up contract deployment
cd packages/contracts
npm install

# Add your private key to .env
echo "PRIVATE_KEY=0xYOUR_PRIVATE_KEY" > .env

# Deploy to BNB testnet
npm run deploy:testnet
```

### 6.2 Switch to Production Mode
Update Railway environment:
```bash
TEST_MODE=false
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
RELAYER_PRIVATE_KEY=0xYOUR_RELAYER_PRIVATE_KEY
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
```

### 6.3 Update Frontend
Update Vercel environment:
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

---

## 🛠️ Troubleshooting

### Common Issues

**1. Railway Build Fails**
- Check Node.js version (needs 18+)
- Verify environment variables are set
- Check Railway logs for specific errors

**2. Authentication Not Working**
- Verify NEXTAUTH_SECRET is set and unique
- Check NEXTAUTH_URL matches your domain
- Ensure MetaMask is connected to correct network

**3. Database Connection Issues**
- Verify SUPABASE_SERVICE_KEY is correct
- Check Supabase project is active
- Ensure database schema was deployed

**4. CORS Errors**
- Update CORS_ORIGINS in Railway
- Include both localhost and production URLs
- Restart Railway service after changes

### Health Check Endpoints

- **Relayer**: `https://your-railway-app.railway.app/health`
- **Queue Status**: `https://your-railway-app.railway.app/api/queue/status`
- **Frontend**: Check browser console for errors

---

## 📊 Success Metrics

Your deployment is successful when:

✅ **Authentication**: MetaMask connects and SIWE works  
✅ **Test Tokens**: Users start with 1000 tokens  
✅ **Pump Mechanics**: Pressure increases, pot grows  
✅ **Balloon Pop**: Game resets after threshold  
✅ **Rewards**: Winners receive tokens  
✅ **Leaderboard**: Rankings update in real-time  
✅ **Performance**: Sub-second response times  

---

## 🎉 You're Live!

Your BNB Balloon Pump game is now fully deployed with:

- 🎮 **Full game mechanics** working in test mode
- 🔐 **MetaMask authentication** as primary login
- ⚡ **Real-time updates** via Supabase
- 🚀 **Scalable architecture** ready for blockchain
- 📱 **Mobile responsive** design
- 🏆 **Leaderboard** and statistics

**Share your game and start testing!** 

When ready, follow Step 6 to add real BNB blockchain transactions.

# 🎈 BNB Balloon Pump Game - Don't Pop the Balloon Edition

A sophisticated balloon pumping game with **hybrid architecture** combining instant Supabase updates with BNB Smart Chain finality, featuring the exciting "Don't Pop the Balloon" mechanics.

## 🌟 Features

- ⚡ **Instant UI Updates** - No waiting for blockchain confirmations
- ⛓️ **Blockchain Security** - All transactions confirmed on BNB Chain  
- 🔄 **Real-time Sync** - Multi-user game state synchronization
- 🎮 **Gasless Gaming** - Users don't pay gas fees
- 🔐 **MetaMask Auth** - Sign-In With Ethereum (SIWE)
- 📊 **Live Leaderboard** - Real-time rankings and statistics
- 🏦 **Vault System** - Deposit tokens to participate
- 🎲 **Random Popping** - Balloons can pop at any time
- 💰 **Enhanced Payouts** - 80%/10%/5%/2.5%/2.5% distribution

## 🏗️ Architecture

### Hybrid Flow
1. **User Action** → Frontend sends to Relayer
2. **Instant Update** → Supabase updates immediately (optimistic)
3. **UI Response** → User sees changes instantly
4. **Blockchain** → Transaction submitted to BNB Chain (async)
5. **Confirmation** → Indexer syncs blockchain state back to Supabase

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Relayer      │    │    Indexer      │
│   (Next.js)     │◄──►│  (Optimistic)   │    │  (Event Sync)   │
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

## 📋 Project Structure

```
/BNB-BalloonPump/
├── apps/
│   ├── web/              # Next.js frontend with MetaMask auth
│   ├── relayer/          # Gasless transaction relayer
│   └── indexer/          # Blockchain event indexer
├── packages/
│   ├── contracts/        # Hardhat smart contract project
│   └── shared/           # Shared types and configurations
├── setup-hybrid-schema.sql    # Database schema
├── HYBRID-DEPLOYMENT-GUIDE.md # Complete deployment guide
└── *-env-template.txt          # Environment templates
```

## 🚀 Quick Deployment

### 1. Database Setup (2 minutes)
1. Go to [Supabase](https://supabase.com/dashboard/project/uvmfrbiojefvtbfgbcfk/sql)
2. Copy & paste `setup-hybrid-schema.sql` → Click **Run**
3. Get your `service_role` key from Settings → API

### 2. Deploy Services
- **Relayer**: Deploy `apps/relayer` to [Railway](https://railway.app)
- **Indexer**: Deploy `apps/indexer` to Railway (optional for test mode)
- **Frontend**: Deploy `apps/web` to [Vercel](https://vercel.com)

### 3. Environment Setup
Use the provided templates:
- `relayer-env-template.txt` → `apps/relayer/.env`
- `indexer-env-template.txt` → `apps/indexer/.env`
- Frontend env vars in Vercel dashboard

## 🎮 How to Play

1. **Connect MetaMask** → Sign SIWE message
2. **Deposit to Vault** → Add tokens to your personal vault
3. **Pump Balloon** → Deduct tokens from vault, increase pressure
4. **Risk vs Reward** → Balloons can pop randomly at any time!
5. **Win Big** → Last 3 pumpers win: 80%/10%/5% of pot
6. **Real-time** → See all players' actions instantly

### New Payout Structure
- 🥇 **Winner (Last Pumper)**: 80% of pot
- 🥈 **Second to Last**: 10% of pot  
- 🥉 **Third to Last**: 5% of pot
- 👨‍💻 **Developer Fee**: 2.5% of pot
- 🔥 **Token Burn**: 2.5% of pot

## 🔧 Modes

### Test Mode (`TEST_MODE=true`)
- ✅ Pure Supabase simulation
- ✅ No blockchain required
- ✅ Instant responses
- ✅ Perfect for development

### Hybrid Mode (`TEST_MODE=false`)
- ✅ Optimistic Supabase updates
- ✅ BNB blockchain confirmation
- ✅ Best user experience
- ✅ Production ready

## 📚 Documentation

- **[HYBRID-DEPLOYMENT-GUIDE.md](./HYBRID-DEPLOYMENT-GUIDE.md)** - Complete setup guide
- **[apps/relayer/README.md](./apps/relayer/README.md)** - Relayer service details

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start all services
npm run dev

# Or start individually
npm run dev:web      # Frontend on :3000
npm run dev:relayer  # Relayer service
npm run dev:indexer  # Indexer service
```

## 🔐 Security Features

- **Smart Contract**: Reentrancy protection, access control, emergency pause
- **Relayer**: Rate limiting, input validation, secure key management
- **Frontend**: SIWE authentication, optimistic UI with confirmation

## 🎯 Benefits

- **Instant UX** - No blockchain waiting times
- **Blockchain Security** - Cryptographic finality
- **Scalable** - Handles many concurrent users
- **Cost Effective** - Users don't pay gas fees
- **Reliable** - Works even if blockchain is slow

---

**Built with ❤️ for the future of Web3 gaming**

Deploy your hybrid balloon pump game in minutes! 🚀
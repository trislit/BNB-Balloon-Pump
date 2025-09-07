# 🎈 BNB Balloon Pump Game - Full Technical Implementation

A sophisticated blockchain-based balloon pumping game on BNB Chain with AI-powered features, gasless transactions via relayer, and real-time indexing.

## 🌟 Features

- **🎮 Gasless Gaming**: Pump balloons without paying gas fees
- **⛓️ BNB Smart Chain**: Full EVM compatibility with BNB Chain
- **🤖 AI Integration**: Multiple MCP servers for enhanced gameplay
- **🎨 Dynamic Visuals**: Real-time balloon animations and effects
- **📊 Real-time Leaderboard**: Live player rankings and statistics
- **🔗 Multi-Service Architecture**: Relayer, Indexer, and Frontend services
- **💰 Token Rewards**: Earn BPM tokens on BNB Chain
- **🎯 Risk Management**: Strategic gameplay with balloon popping mechanics
- **🔐 Secure Authentication**: SIWE (Sign-In with Ethereum) integration

## 🏗️ Architecture Overview

### **Hybrid Architecture: On-Chain + Off-Chain**

#### **On-Chain (BNB Smart Chain):**
- ✅ Game results and outcomes
- ✅ Token balances and transfers
- ✅ Reward distributions
- ✅ Core game logic and rules
- ✅ Audit trail of all game actions

#### **Off-Chain (Database + Services):**
- 🔄 User session management with Supabase
- 🔄 Game state caching (5-minute TTL)
- 🔄 Analytics and statistics
- 🔄 Real-time subscriptions for live updates
- 🔄 Row Level Security (RLS) for data protection

#### **Services Architecture:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Relayer      │    │    Indexer      │
│   (Next.js)     │◄──►│  (Gasless TX)   │    │  (Event Sync)   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Smart Contract │
                    │  (BalloonPump)  │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Supabase DB   │
                    │   (Cache/Auth)  │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Supabase Account** (free tier available)
- **MetaMask** or compatible Web3 wallet
- **BNB Chain testnet BNB** for gas fees

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd BNB-BalloonPump

# Install dependencies for all packages
npm install
```

### 2. Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → API to get your credentials
4. Run the SQL setup script:

```bash
# Run this in Supabase SQL Editor
cat infra/supabase/schema.sql | psql
```

### 3. Environment Configuration

Copy and configure environment files:

```bash
# Root .env
cp .env.example .env

# Frontend environment
cp apps/web/.env.example apps/web/.env

# Services environment
cp apps/relayer/.env.example apps/relayer/.env
cp apps/indexer/.env.example apps/indexer/.env
```

Configure your `.env` files:

```env
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# Relayer
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
RELAYER_PRIVATE_KEY=your-relayer-private-key
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Indexer (same as relayer)
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
CONTRACT_ADDRESS=0x...
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### 4. Smart Contract Deployment

```bash
# Install contract dependencies
cd packages/contracts
npm install

# Compile contracts
npm run compile

# Deploy to testnet
npm run deploy:testnet

# Copy the deployed contract address to your .env files
```

### 5. Start the Application

```bash
# Start all services
npm run dev

# Or start individually:
npm run dev:frontend  # Next.js app on :3000
npm run dev:relayer   # Relayer service
npm run dev:indexer   # Indexer service
```

The game will be available at `http://localhost:3000`

## 🎯 How to Play

1. **Connect Wallet**: Link your MetaMask to BNB Chain
2. **Sign In**: Use SIWE to authenticate securely
3. **Deposit BNB**: Add funds to your vault
4. **Pump Balloon**: Click to inflate and increase potential rewards
5. **Manage Risk**: Monitor risk levels - too much inflation = POP!
6. **Cash Out**: Secure your earnings before the balloon bursts
7. **Earn Rewards**: Successful pumps mint BPM tokens on BNB Chain

## 📋 Project Structure

```
/BNB-BalloonPump/
├── apps/
│   ├── web/              # Next.js frontend application
│   ├── relayer/          # Gasless transaction relayer
│   └── indexer/          # Blockchain event indexer
├── packages/
│   ├── contracts/        # Hardhat smart contract project
│   └── shared/           # Shared types and configurations
├── infra/
│   ├── supabase/         # Database schema and migrations
│   └── workflows/        # CI/CD pipelines
├── .cursor/              # MCP server configurations
└── scripts/              # Utility scripts
```

## 🔧 Available Scripts

### Root Scripts
```bash
npm run dev              # Start all services
npm run dev:frontend     # Start only frontend
npm run dev:relayer      # Start only relayer
npm run dev:indexer      # Start only indexer
npm run build            # Build all packages
npm run test             # Run all tests
npm run lint             # Lint all code
```

### Contract Scripts
```bash
cd packages/contracts
npm run compile          # Compile Solidity contracts
npm run test             # Run contract tests
npm run deploy:testnet   # Deploy to BNB testnet
npm run deploy:mainnet   # Deploy to BNB mainnet
```

### Frontend Scripts
```bash
cd apps/web
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint code
```

## 🎨 Smart Contract Details

### BalloonPump.sol Features

- **Vault System**: Deposit/withdraw BNB for gasless pumping
- **Round Management**: Automated round creation with thresholds
- **Risk Mechanics**: Progressive difficulty based on balloon size
- **Reward Distribution**: 85/10/3/1/1 split for winner/2nd/3rd/platform/burn
- **Relayer Integration**: Only authorized relayer can execute pumps
- **Emergency Controls**: Pause/unpause and emergency withdrawal

### Key Functions

```solidity
// User functions
deposit(address token, uint256 amount)           // Deposit to vault
withdraw(address token, uint256 amount)          // Withdraw from vault
pump(address user, address token, uint256 spend) // Pump balloon (relayer only)

// Admin functions
setConfig(...)                                    // Update contract config
openRound(uint256 threshold)                      // Start new round
pause()/unpause()                                // Emergency controls
```

## 🔗 MCP Server Integrations

The game integrates with 16+ MCP servers for enhanced features:

### 🤖 AI & ML Services
- **Pixellab**: AI-generated balloon images
- **Hugging Face**: Advanced AI models
- **Sequential Thinking**: Strategic game analysis

### ⛓️ Blockchain Services
- **Tatum.io**: BNB Chain interactions
- **Solana Developer**: Cross-chain capabilities

### 🛠️ Development Tools
- **GitHub**: Repository management
- **Vercel**: Deployment automation
- **Supabase**: Database and real-time features

## 🔐 Security Features

### Smart Contract Security
- Reentrancy protection with ReentrancyGuard
- Access control with Ownable2Step
- Emergency pause functionality
- Input validation on all functions
- Caps on maximum pump amounts

### Relayer Security
- Rate limiting per user/IP
- Only authorized contract interactions
- Isolated private key management
- Comprehensive error handling

### Frontend Security
- SIWE authentication (no password storage)
- Input sanitization and validation
- Secure RPC communication
- Optimistic UI with blockchain confirmation

## 📊 Database Schema

### Key Tables

```sql
-- User profiles and authentication
profiles (
  id uuid primary key,
  evm_address text unique,
  created_at timestamptz
)

-- Confirmed on-chain deposits
deposits (
  tx text primary key,
  user_id uuid,
  token text,
  amount numeric,
  round_id bigint,
  confirmed boolean
)

-- Pump requests (client → relayer)
pumps (
  id uuid primary key,
  user_id uuid,
  round_id bigint,
  token text,
  spend numeric,
  status text check (status in ('queued','sent','confirmed','failed'))
)

-- Real-time game state cache
rounds_cache (
  round_id bigint primary key,
  status text,
  pressure numeric,
  pot numeric,
  last1 text, last2 text, last3 text
)

-- Player statistics and leaderboard
leaderboard (
  user_id uuid primary key,
  net_winnings numeric,
  total_deposited numeric,
  pops_triggered int
)
```

## 🚀 Deployment

### Environment Configuration

#### Development
- **Frontend**: Vercel/Netlify
- **Backend Services**: Railway/Fly.io
- **Database**: Supabase
- **RPC**: Public BNB testnet RPCs

#### Production
- **Frontend**: Vercel with custom domain
- **Services**: Railway with monitoring
- **Database**: Supabase Pro plan
- **RPC**: Dedicated RPC nodes (Ankr/GetBlock)

### Deployment Steps

1. **Contract Deployment**:
   ```bash
   npm run deploy:mainnet
   ```

2. **Database Setup**:
   ```bash
   # Run migrations on Supabase
   psql -f infra/supabase/migrations/001_initial.sql
   ```

3. **Service Deployment**:
   ```bash
   # Deploy relayer
   fly deploy apps/relayer

   # Deploy indexer
   fly deploy apps/indexer
   ```

4. **Frontend Deployment**:
   ```bash
   vercel --prod apps/web
   ```

## 🧪 Testing Strategy

### Contract Testing
```bash
cd packages/contracts
npm run test              # Unit tests
npm run test:gas          # Gas usage analysis
npm run coverage          # Coverage reports
```

### Service Testing
```bash
# Relayer tests
cd apps/relayer
npm run test

# Indexer tests
cd apps/indexer
npm run test

# Integration tests
npm run test:integration
```

### End-to-End Testing
```bash
npm run test:e2e  # Playwright tests
```

## 📈 Monitoring & Analytics

### Key Metrics
- **Relayer**: Transaction success rate, queue depth, gas costs
- **Indexer**: Event processing latency, sync status
- **Frontend**: Page load times, user engagement
- **Contracts**: Gas usage, transaction volume

### Monitoring Tools
- **Sentry**: Error tracking and performance monitoring
- **Grafana**: Dashboard for service metrics
- **Supabase Analytics**: Database performance and usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the full test suite: `npm run test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Workflow

1. **Local Development**:
   ```bash
   npm run dev  # Start all services
   ```

2. **Testing**:
   ```bash
   npm run test:all  # Run complete test suite
   ```

3. **Code Quality**:
   ```bash
   npm run lint     # Lint all code
   npm run type-check  # TypeScript checks
   ```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Contract Deployment Fails**:
   - Check RPC endpoint connectivity
   - Verify sufficient testnet BNB balance
   - Ensure correct network configuration

2. **Relayer Connection Issues**:
   - Verify Supabase credentials
   - Check relayer private key format
   - Ensure contract address is correct

3. **Authentication Problems**:
   - Verify SIWE message format
   - Check NextAuth configuration
   - Ensure wallet is on correct network

4. **Database Connection Issues**:
   - Verify Supabase URL and keys
   - Check RLS policies
   - Ensure database is accessible

### Support

For issues and questions:
- Check the troubleshooting guide above
- Review the MCP server configurations in `.cursor/`
- Ensure all environment variables are set correctly
- Verify wallet connectivity to BNB Chain
- Check service logs for detailed error messages

## 🎉 Acknowledgments

- Built with the power of MCP servers
- Inspired by classic risk-reward games
- Powered by BNB Chain ecosystem
- Enhanced with AI and machine learning
- Thanks to the Ethereum and Web3 communities

---

**Happy Pumping! 🎈💰**
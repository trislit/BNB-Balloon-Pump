#!/bin/bash

# =================================================
# Quick Relayer Environment Setup
# =================================================

echo "🚀 Setting up relayer environment..."
echo "==================================="

# Create relayer .env file
echo "📝 Creating apps/relayer/.env..."
cat > apps/relayer/.env << 'EOL'
# =============================================
# BNB Balloon Pump Relayer - Essential Configuration
# =============================================

# Service Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# RPC Configuration
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
RPC_URL_FALLBACK=https://data-seed-prebsc-2-s1.binance.org:8545/

# 🔑 RELAYER PRIVATE KEY (FILL THIS IN!)
RELAYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# Contract Configuration
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=97

# Supabase Configuration
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM

# 🔑 SUPABASE SERVICE KEY (FILL THIS IN!)
SUPABASE_SERVICE_KEY=your-supabase-service-key-here

# Relayer Settings
MAX_TX_PER_MINUTE_PER_USER=10
MAX_PENDING_TX=100
PRIORITY_FEE=5000000000

# Queue Settings
QUEUE_PROCESS_INTERVAL_MS=1000
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY_MS=5000

# Security Settings
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
HEALTH_CHECK_INTERVAL_MS=30000
EOL

# Create contracts .env file
echo "📝 Creating packages/contracts/.env..."
cat > packages/contracts/.env << 'EOL'
# =============================================
# Smart Contract Deployment Configuration
# =============================================

# 🔑 PRIVATE KEY FOR DEPLOYMENT (FILL THIS IN!)
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# BNB Smart Chain Testnet
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/

# BscScan API Key (optional)
BSCSCAN_API_KEY=your-bscscan-api-key
EOL

echo ""
echo "✅ Environment files created!"
echo ""
echo "📋 FILL IN THESE VALUES:"
echo ""
echo "1. 🔑 RELAYER_PRIVATE_KEY:"
echo "   - Export from MetaMask: Account Details → Export Private Key"
echo "   - Update in: apps/relayer/.env"
echo ""
echo "2. 🔑 SUPABASE_SERVICE_KEY:"
echo "   - Get from: Supabase Dashboard → Settings → API → service_role key"
echo "   - Update in: apps/relayer/.env"
echo ""
echo "3. 🔑 PRIVATE_KEY (contracts):"
echo "   - Same as relayer key or separate deployment wallet"
echo "   - Update in: packages/contracts/.env"
echo ""
echo "🚀 Next: Run ./deploy-contract.sh after getting testnet BNB!"
echo ""
echo "⚠️  REMEMBER: Never commit .env files to Git!"

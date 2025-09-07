#!/bin/bash

# =================================================
# BNB Balloon Pump - Test Mode Setup
# =================================================

echo "🎮 Setting up BNB Balloon Pump - TEST MODE"
echo "=========================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Prerequisites OK"

# Create environment files
echo ""
echo "📝 Creating environment files..."

# Relayer .env
cat > apps/relayer/.env << 'EOF'
# =============================================
# BNB Balloon Pump Relayer - Test Mode
# =============================================

# Service Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
TEST_MODE=true

# RPC Configuration (not needed in test mode)
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
RPC_URL_FALLBACK=https://data-seed-prebsc-2-s1.binance.org:8545/

# Relayer Private Key (not needed in test mode)
RELAYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# Contract Configuration (not needed in test mode)
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=97

# Supabase Configuration
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM

# 🔑 SUPABASE SERVICE KEY (YOU NEED TO FILL THIS IN!)
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
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
HEALTH_CHECK_INTERVAL_MS=30000
EOF

echo "✅ Relayer .env created"

# Contracts .env (minimal for test mode)
cat > packages/contracts/.env << 'EOF'
# Test mode - no blockchain needed
TEST_MODE=true
EOF

echo "✅ Contracts .env created"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."

# Root dependencies
npm install

# Relayer dependencies
cd apps/relayer
npm install
cd ../..

# Contracts dependencies (minimal)
cd packages/contracts
npm install
cd ../..

echo "✅ Dependencies installed"

echo ""
echo "🗄️ Database Setup:"
echo "1. Go to: https://supabase.com/dashboard/project/uvmfrbiojefvtbfgbcfk/sql"
echo "2. Copy and paste: setup-test-mode.sql"
echo "3. Click 'Run' to create test tables"

echo ""
echo "🔑 Service Key Setup:"
echo "1. Go to Supabase Settings → API"
echo "2. Copy the 'service_role' key"
echo "3. Update SUPABASE_SERVICE_KEY in apps/relayer/.env"

echo ""
echo "🚀 Start the game:"
echo "npm run dev"

echo ""
echo "🎮 Test Mode Features:"
echo "• ✅ Test tokens tracked in Supabase"
echo "• ✅ No blockchain/gas fees needed"
echo "• ✅ Full game mechanics working"
echo "• ✅ Real-time leaderboard"
echo "• ✅ Balloon pop mechanics"

echo ""
echo "🎉 Setup complete! Get your SUPABASE_SERVICE_KEY and you're ready to play!"

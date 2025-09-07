#!/bin/bash

# =================================================
# Create Environment File Script
# =================================================

echo "📝 Creating environment files from template..."
echo "============================================="

# Create main .env file
if [ ! -f ".env" ]; then
    echo "📄 Creating main .env file..."
    cp env-setup-guide.txt .env
    echo "✅ Main .env file created from template"
else
    echo "⚠️  Main .env file already exists, skipping..."
fi

# Create frontend .env.local
if [ ! -f "apps/web/.env.local" ]; then
    echo "📄 Creating frontend .env.local file..."
    cat > apps/web/.env.local << 'EOF'
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-in-production

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# WalletConnect (optional)
NEXT_PUBLIC_WC_PROJECT_ID=your-walletconnect-project-id
EOF
    echo "✅ Frontend .env.local file created"
else
    echo "⚠️  Frontend .env.local file already exists, skipping..."
fi

# Create relayer .env
if [ ! -f "apps/relayer/.env" ]; then
    echo "📄 Creating relayer .env file..."
    cat > apps/relayer/.env << 'EOF'
# Relayer Service Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# RPC Configuration
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
RPC_URL_FALLBACK=https://data-seed-prebsc-2-s1.binance.org:8545/

# Relayer Private Key (CRITICAL: Keep this secure!)
RELAYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# Contract Configuration
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=97

# Supabase Configuration
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM
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
EOF
    echo "✅ Relayer .env file created"
else
    echo "⚠️  Relayer .env file already exists, skipping..."
fi

# Create contracts .env
if [ ! -f "packages/contracts/.env" ]; then
    echo "📄 Creating contracts .env file..."
    cat > packages/contracts/.env << 'EOF'
# Private Key for Deployment (NEVER commit this!)
PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# BNB Smart Chain Testnet
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/

# BscScan API Key (for contract verification)
BSCSCAN_API_KEY=your-bscscan-api-key

# Tatum.io Configuration (optional)
TATUM_API_KEY=your-tatum-api-key
EOF
    echo "✅ Contracts .env file created"
else
    echo "⚠️  Contracts .env file already exists, skipping..."
fi

echo ""
echo "🎉 Environment files created!"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env files and fill in your actual values"
echo "2. Get your SUPABASE_SERVICE_KEY from Supabase dashboard"
echo "3. Export your wallet private key for RELAYER_PRIVATE_KEY"
echo "4. Run: ./deploy-contract.sh (after getting testnet BNB)"
echo "5. Update CONTRACT_ADDRESS in all .env files after deployment"
echo ""
echo "🔐 Remember: Never commit .env files to Git!"
echo ""
echo "🚀 Ready to start your BNB Balloon Pump Game!"

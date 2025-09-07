#!/bin/bash

# =================================================
# BNB Balloon Pump Game - Project Setup Script
# =================================================

echo "🎈 Setting up BNB Balloon Pump Game..."
echo "========================================"

# Check if .env files exist
if [ ! -f ".env" ]; then
    echo "📝 Creating main .env file..."
    cat > .env << EOL
# =============================================
# BNB Balloon Pump Game - Environment Variables
# =============================================

# Frontend Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-in-production
NEXT_PUBLIC_SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Backend Configuration
PORT=5001
NODE_ENV=development
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM
EOL
    echo "✅ Main .env file created"
else
    echo "⚠️  Main .env file already exists, skipping..."
fi

# Create frontend env file
if [ ! -f "apps/web/.env.local" ]; then
    echo "📝 Creating frontend .env.local file..."
    cat > apps/web/.env.local << EOL
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-in-production

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM

# Blockchain Configuration
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
EOL
    echo "✅ Frontend .env.local file created"
else
    echo "⚠️  Frontend .env.local file already exists, skipping..."
fi

# Create relayer env file
if [ ! -f "apps/relayer/.env" ]; then
    echo "📝 Creating relayer .env file..."
    cat > apps/relayer/.env << EOL
# Relayer Service Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# RPC Configuration
RPC_URL_PRIMARY=https://data-seed-prebsc-1-s1.binance.org:8545/
RPC_URL_FALLBACK=https://data-seed-prebsc-2-s1.binance.org:8545/

# Contract Configuration
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
CHAIN_ID=97

# Supabase Configuration
SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key-here

# Relayer Settings
MAX_TX_PER_MINUTE_PER_USER=10
MAX_PENDING_TX=100
PRIORITY_FEE=5000000000
EOL
    echo "✅ Relayer .env file created"
else
    echo "⚠️  Relayer .env file already exists, skipping..."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update SUPABASE_SERVICE_KEY in apps/relayer/.env"
echo "2. Update CONTRACT_ADDRESS in all .env files after deployment"
echo "3. Update NEXTAUTH_SECRET with a secure random string"
echo "4. Run: npm run dev"
echo ""
echo "🚀 Your BNB Balloon Pump Game is ready to go!"

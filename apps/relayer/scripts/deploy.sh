#!/bin/bash

# Railway Deployment Script for Balloon Pump Relayer
echo "🚀 Deploying Balloon Pump Relayer to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    curl -fsSL https://railway.app/install.sh | sh
    export PATH="$HOME/.railway/bin:$PATH"
fi

# Login to Railway (interactive)
echo "🔐 Logging into Railway..."
railway login

# Link to existing project or create new one
echo "🔗 Linking Railway project..."
if railway link 2>/dev/null; then
    echo "✅ Linked to existing project"
else
    echo "📝 Creating new Railway project..."
    railway init balloon-pump-relayer --source=.
fi

# Set environment variables
echo "⚙️  Configuring environment variables..."

# Core configuration
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set LOG_LEVEL=info

# RPC Configuration
echo "🌐 Configuring RPC endpoints..."
railway variables set RPC_URL_PRIMARY="https://data-seed-prebsc-1-s1.binance.org:8545/"
railway variables set RPC_URL_FALLBACK="https://data-seed-prebsc-2-s1.binance.org:8545/"

# Contract Configuration
echo "📋 Configuring contract settings..."
railway variables set CHAIN_ID=97

# Relayer Settings
echo "⚡ Configuring relayer settings..."
railway variables set MAX_TX_PER_MINUTE_PER_USER=10
railway variables set MAX_PENDING_TX=100
railway variables set PRIORITY_FEE=5000000000

# Queue Settings
railway variables set QUEUE_PROCESS_INTERVAL_MS=1000
railway variables set QUEUE_MAX_RETRIES=3
railway variables set QUEUE_RETRY_DELAY_MS=5000

# Security Settings
railway variables set RATE_LIMIT_WINDOW_MS=60000
railway variables set RATE_LIMIT_MAX_REQUESTS=100

echo "⚠️  IMPORTANT: You need to set these sensitive variables manually:"
echo "   - RELAYER_PRIVATE_KEY: Your relayer wallet private key"
echo "   - CONTRACT_ADDRESS: Deployed BalloonPump contract address"
echo "   - SUPABASE_URL: Your Supabase project URL"
echo "   - SUPABASE_SERVICE_KEY: Your Supabase service key"
echo "   - CORS_ORIGINS: Allowed frontend URLs"
echo ""

# Prompt for sensitive variables
read -p "Do you have these values ready? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔑 Setting sensitive variables..."

    read -p "RELAYER_PRIVATE_KEY: " RELAYER_PRIVATE_KEY
    railway variables set RELAYER_PRIVATE_KEY="$RELAYER_PRIVATE_KEY"

    read -p "CONTRACT_ADDRESS: " CONTRACT_ADDRESS
    railway variables set CONTRACT_ADDRESS="$CONTRACT_ADDRESS"

    read -p "SUPABASE_URL: " SUPABASE_URL
    railway variables set SUPABASE_URL="$SUPABASE_URL"

    read -p "SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY
    railway variables set SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY"

    read -p "CORS_ORIGINS (comma-separated): " CORS_ORIGINS
    railway variables set CORS_ORIGINS="$CORS_ORIGINS"

    echo "✅ All variables configured!"
else
    echo "⏭️  Skipping sensitive variables. Set them manually in Railway dashboard."
fi

# Deploy
echo "🚀 Deploying to Railway..."
railway up

# Get the deployment URL
echo "🔗 Deployment URL:"
railway domain

# Health check
echo "🩺 Running health check..."
DEPLOYMENT_URL=$(railway domain)
if [ ! -z "$DEPLOYMENT_URL" ]; then
    echo "🌐 Testing health endpoint..."
    sleep 10 # Wait for deployment to be ready

    if curl -f -s "$DEPLOYMENT_URL/health" > /dev/null; then
        echo "✅ Health check passed!"
        echo "🎉 Relayer deployed successfully!"
        echo "📊 Monitor at: https://railway.app/project"
    else
        echo "⚠️  Health check failed. Check Railway logs for details."
    fi
else
    echo "⚠️  Could not retrieve deployment URL. Check Railway dashboard."
fi

echo ""
echo "📝 Next steps:"
echo "1. Verify all environment variables are set correctly"
echo "2. Test the health endpoint: GET /health"
echo "3. Monitor logs in Railway dashboard"
echo "4. Test a pump transaction"
echo ""
echo "📚 Documentation: Check the README.md for API details"

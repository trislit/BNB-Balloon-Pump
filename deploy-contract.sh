#!/bin/bash

# =================================================
# Smart Contract Deployment Script
# =================================================

echo "🚀 Deploying Balloon Pump Smart Contract..."
echo "==========================================="

# Check if we're in the right directory
if [ ! -d "packages/contracts" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "Usage: ./deploy-contract.sh"
    exit 1
fi

# Navigate to contracts package
cd packages/contracts

echo ""
echo "📦 Installing contract dependencies..."
npm install

echo ""
echo "🔨 Compiling smart contracts..."
npm run compile

echo ""
echo "⚠️  IMPORTANT: Before deployment, you need:"
echo "1. Testnet BNB in your wallet for gas fees"
echo "2. PRIVATE_KEY environment variable set"
echo "3. BSCSCAN_API_KEY (optional, for verification)"
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY environment variable is not set!"
    echo ""
    echo "📋 To set your private key:"
    echo "1. Create a .env file in packages/contracts/"
    echo "2. Add: PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE"
    echo "3. Make sure you have testnet BNB: https://testnet.binance.org/faucet-smart"
    echo ""
    read -p "Do you have your private key ready? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "⏭️  Please set up your private key and run this script again."
        exit 1
    fi
fi

echo ""
echo "🌐 Deploying to BNB Smart Chain Testnet..."
echo "This may take a few minutes..."
echo ""

# Deploy to testnet
npm run deploy:testnet

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the deployed contract address"
echo "2. Update CONTRACT_ADDRESS in all .env files:"
echo "   - .env"
echo "   - apps/web/.env.local"
echo "   - apps/relayer/.env"
echo ""
echo "🔍 You can verify the contract on:"
echo "https://testnet.bscscan.com/"
echo ""
echo "🎮 Ready to start the game!"
echo "Run from project root: npm run dev"

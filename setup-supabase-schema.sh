#!/bin/bash

# =================================================
# Supabase Database Schema Setup Script
# =================================================

echo "🗄️  Setting up Supabase Database Schema..."
echo "=========================================="

echo ""
echo "📋 Please follow these steps:"
echo ""
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Select your project: uvmfrbiojefvtbfgbcfk"
echo "3. Go to SQL Editor"
echo "4. Copy and paste the entire schema from:"
echo "   infra/supabase/schema.sql"
echo "5. Click 'Run' to execute"
echo ""

echo "📄 Schema includes these tables:"
echo "• profiles - User authentication profiles"
echo "• deposits - Confirmed on-chain deposits"
echo "• pumps - Pump transaction requests"
echo "• rounds_cache - Game state cache"
echo "• leaderboard - Player rankings"
echo "• user_sessions - Session management"
echo "• webhooks - Event webhook storage"
echo ""

echo "🔒 Security features:"
echo "• Row Level Security (RLS) enabled"
echo "• Proper authentication policies"
echo "• User data isolation"
echo ""

echo "✅ After running the schema, you should see:"
echo "• All tables created successfully"
echo "• No error messages"
echo ""

echo "🚀 Next step: Deploy smart contract"
echo "Run: cd packages/contracts && npm run deploy:testnet"

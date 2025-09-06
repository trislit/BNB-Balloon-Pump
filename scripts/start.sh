#!/bin/bash

# BNB Balloon Pump Game Startup Script
echo "🎈 Starting BNB Balloon Pump Game..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if environment file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copying from env.example..."
    cp env.example .env
    echo "✅ Created .env file. Please edit it with your configuration."
fi

# Check Supabase configuration
echo "🗄️  Checking Supabase configuration..."
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Supabase credentials not found in environment"
    echo "   Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file"
    echo "   Get credentials from: https://supabase.com/dashboard"
    echo "   Create free account and project (takes ~2 minutes)"
else
    echo "✅ Supabase credentials found"
    echo "   URL: $SUPABASE_URL"
    echo "   📋 Don't forget to run the SQL setup in Supabase dashboard!"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Start backend server in background
echo "🚀 Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend development server
echo "🎮 Starting frontend development server..."
cd frontend && npm start &
FRONTEND_PID=$!

# Wait for user input to stop
echo ""
echo "🎯 BNB Balloon Pump Game is running!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5001"
echo "🗄️  Database: Supabase (PostgreSQL)"
echo ""
echo "🚀 Supabase Features Enabled:"
echo "   • Real-time subscriptions for live game updates"
echo "   • User session management with cross-device sync"
echo "   • Game state caching (5-minute TTL)"
echo "   • Analytics and statistics with SQL queries"
echo "   • Action logging and complete audit trails"
echo "   • Row Level Security (RLS) for data protection"
echo "   • Auto-generated REST & GraphQL APIs"
echo ""
echo "🎮 Game Features:"
echo "   • Vault-based token deposits"
echo "   • Progressive risk mechanics"
echo "   • Multi-tier reward distribution (85/10/3/1/1)"
echo "   • On-chain game results"
echo "   • Real-time multiplayer support"
echo ""
echo "💡 Pro Tips:"
echo "   • Use Supabase dashboard for real-time data monitoring"
echo "   • Enable Row Level Security in production"
echo "   • Set up Supabase Auth for advanced user features"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Wait for processes
wait


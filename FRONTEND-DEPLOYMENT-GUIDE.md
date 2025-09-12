# 🚀 Frontend Deployment Guide

## 🎯 Overview

This guide will help you deploy the BNB Balloon Pump frontend to Vercel with all the working game mechanics integrated.

## ✅ What's Working

- ✅ **Complete Game Mechanics** - All "Don't Pop the Balloon" features
- ✅ **Test Token System** - Using `0xTEST0000...` for development
- ✅ **Real-time Updates** - Pressure, pot, and balance updates
- ✅ **Multi-user Support** - Multiple users can play simultaneously
- ✅ **Vault System** - Deposit/withdraw test tokens
- ✅ **Balloon Popping** - Random popping with realistic chances
- ✅ **Payout Distribution** - 80%/10%/5%/2.5%/2.5% structure
- ✅ **Leaderboard** - Real-time rankings and statistics

## 🚀 Quick Deployment

### Option 1: Automatic Deployment (Recommended)

```bash
# Run the deployment script
./deploy-frontend.sh
```

### Option 2: Manual Deployment

```bash
# Navigate to web app
cd apps/web

# Install dependencies
npm install

# Build the application
npm run build

# Deploy to Vercel
vercel --prod
```

## ⚙️ Environment Variables Setup

### 1. Vercel Dashboard Configuration

Go to your Vercel project dashboard and set these environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bWZyYmlvamVmdnRiZmdiY2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDM1MDMsImV4cCI6MjA3Mjc3OTUwM30.vOknqYlGvcmYoj2L8TuYQuPc-qZIvgei7YGgHRRRvcM

# Relayer Service URL
NEXT_PUBLIC_RELAYER_URL=https://bnb-balloon-pump-production.up.railway.app

# NextAuth Configuration
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production

# Test Token Configuration
NEXT_PUBLIC_TEST_TOKEN_ADDRESS=0xTEST0000000000000000000000000000000000000
NEXT_PUBLIC_TEST_TOKEN_SYMBOL=TEST
NEXT_PUBLIC_TEST_TOKEN_NAME=Test Token
```

### 2. Update NEXTAUTH_URL

After deployment, update the `NEXTAUTH_URL` to your actual Vercel URL:

```bash
# Example: https://bnb-balloon-pump-abc123.vercel.app
NEXTAUTH_URL=https://your-actual-vercel-url.vercel.app
```

## 🎮 Game Features

### **Test Token System**
- **Token Address**: `0xTEST0000000000000000000000000000000000000`
- **Starting Balance**: 1000 test tokens per user
- **No Real Blockchain**: Pure Supabase simulation
- **Instant Transactions**: No gas fees or waiting

### **Game Mechanics**
- **Balloon Pumping**: Click balloon or use controls to pump
- **Random Popping**: 5% base chance, 30% if pressure > 1000
- **Payout Structure**: 80% winner, 10% second, 5% third, 2.5% dev, 2.5% burn
- **Vault System**: Deposit/withdraw test tokens
- **Real-time Updates**: Live pressure, pot, and balance updates

### **Multi-User Features**
- **Live Leaderboard**: Real-time rankings
- **User Profiles**: Nickname selection
- **Balance Management**: Deposit/withdraw system
- **Game History**: Track previous games and winnings

## 🧪 Testing the Deployment

### 1. Basic Functionality Test

1. **Connect Wallet**: Click "Connect Wallet" and sign the message
2. **Set Nickname**: Choose a nickname for the leaderboard
3. **Deposit Tokens**: Add test tokens to your vault
4. **Pump Balloon**: Click the balloon or use controls
5. **Watch Real-time Updates**: See pressure and pot increase
6. **Check Leaderboard**: View your ranking

### 2. Multi-User Test

1. **Open Multiple Tabs**: Test with different wallet addresses
2. **Pump Simultaneously**: Multiple users can pump at the same time
3. **Watch Live Updates**: See other users' actions in real-time
4. **Test Balloon Popping**: Wait for random pop and see payouts

### 3. Game Flow Test

1. **Start New Game**: Fresh pressure and pot
2. **Pump Multiple Times**: Increase pressure gradually
3. **Watch Pop Chance**: See risk level increase
4. **Balloon Pops**: Winner gets 80% of pot
5. **New Round Starts**: Game automatically resets

## 🔧 Troubleshooting

### Common Issues

**1. "Failed to fetch" errors**
- Check if relayer service is running
- Verify `NEXT_PUBLIC_RELAYER_URL` is correct
- Check Railway logs for relayer issues

**2. "User not found" errors**
- User will be created automatically on first interaction
- Check Supabase connection
- Verify environment variables

**3. "Insufficient balance" errors**
- Deposit test tokens to vault first
- Check user balance in database
- Verify deposit function is working

**4. Game state not updating**
- Check real-time subscriptions
- Verify Supabase connection
- Check browser console for errors

### Debug Steps

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify API calls are working
3. **Check Relayer Logs**: Look at Railway dashboard
4. **Check Supabase**: Verify database operations

## 📊 Monitoring

### Key Metrics to Track

- **User Activity**: Number of active users
- **Game Rounds**: How many balloons pop per hour
- **Token Volume**: Total test tokens in circulation
- **User Engagement**: Average pumps per user
- **Error Rates**: Failed transactions and API calls

### Vercel Analytics

- **Page Views**: Track user engagement
- **Performance**: Monitor load times
- **Errors**: Track JavaScript errors
- **Real User Monitoring**: See actual user experience

## 🎉 Success Criteria

Your deployment is successful when:

✅ **Users can connect wallets** and sign messages  
✅ **Deposits work** - users can add test tokens  
✅ **Pumping works** - balloon grows and pressure increases  
✅ **Balloon popping works** - random pops with payouts  
✅ **Multi-user works** - multiple users can play together  
✅ **Real-time updates** - all users see changes instantly  
✅ **Leaderboard works** - rankings update in real-time  
✅ **Vault system works** - deposit/withdraw functions properly  

## 🔮 Next Steps

### Immediate Testing
1. **Share URL** with other users for testing
2. **Test all features** thoroughly
3. **Monitor performance** and error rates
4. **Gather feedback** from test users

### Future Enhancements
1. **Real Token Integration** - Replace test tokens with real meme coins
2. **Mobile Optimization** - Improve mobile experience
3. **Advanced Analytics** - Add detailed game statistics
4. **Tournament Mode** - Multi-round competitions
5. **NFT Rewards** - Special prizes for winners

## 📞 Support

If you encounter issues:

1. **Check the logs** in Vercel dashboard
2. **Check Railway logs** for relayer issues
3. **Check Supabase logs** for database issues
4. **Review this guide** for troubleshooting steps

---

**🎈 Your BNB Balloon Pump game is now live and ready for testing! 🚀**

The complete "Don't Pop the Balloon" experience is deployed with all working mechanics. Users can connect wallets, deposit test tokens, pump balloons, and win real rewards - all without any blockchain transactions!

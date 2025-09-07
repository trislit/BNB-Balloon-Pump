# ⚡ Quick Start - BNB Balloon Pump

Get your game running in **5 minutes**!

## 🎯 What You'll Deploy

- ✅ **MetaMask Login** - Primary authentication method
- ✅ **Test Tokens** - 1000 starting balance per user  
- ✅ **Full Game Mechanics** - Pump, pop, win rewards
- ✅ **Real-time Updates** - Live pressure and leaderboard
- ✅ **No Blockchain Required** - Pure Supabase simulation

---

## 🚀 Step 1: Database (2 minutes)

1. **Go to Supabase**: https://supabase.com/dashboard/project/uvmfrbiojefvtbfgbcfk/sql

2. **Copy & Paste**: Entire contents of `setup-test-mode.sql`

3. **Click Run** ✅

4. **Get Service Key**: Settings → API → Copy `service_role` key

---

## 🚂 Step 2: Backend (2 minutes)  

1. **Railway**: https://railway.app → New Project → Deploy from GitHub

2. **Select Repo**: `BNB-Balloon-Pump` → Root: `apps/relayer`

3. **Add Variables**:
   ```
   TEST_MODE=true
   SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
   SUPABASE_SERVICE_KEY=your-key-from-step-1
   ```

4. **Deploy** ✅

---

## 🌐 Step 3: Frontend (1 minute)

1. **Vercel**: https://vercel.com → New Project → Import Git

2. **Select Repo**: `BNB-Balloon-Pump` → Root: `apps/web`

3. **Add Variables**:
   ```
   NEXTAUTH_SECRET=your-super-secret-key
   NEXT_PUBLIC_SUPABASE_URL=https://uvmfrbiojefvtbfgbcfk.supabase.co
   NEXT_PUBLIC_RELAYER_URL=https://your-railway-app.railway.app
   ```

4. **Deploy** ✅

---

## 🎮 Step 4: Test & Play!

1. **Visit Your App** → Connect MetaMask → Sign Message

2. **Start with 1000 test tokens** 

3. **Pump the balloon** → Watch pressure rise

4. **Win rewards** when balloon pops!

---

## 🔧 Need Help?

- **Railway Logs**: Check for backend errors
- **Browser Console**: Check for frontend errors  
- **Health Check**: `your-railway-url/health` should return "healthy"

## 📖 Full Guide

See `DEPLOYMENT-GUIDE.md` for complete instructions and troubleshooting.

---

**🎉 That's it! Your balloon pump game is live!**

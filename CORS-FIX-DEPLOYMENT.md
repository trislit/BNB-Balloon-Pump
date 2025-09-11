# 🚨 CORS Fix - Quick Deployment Guide

## Problem
Your frontend at `https://bnb-balloon-pump-ljrr97rtz-trislits-projects.vercel.app` is being blocked by CORS when trying to access your relayer service at `https://bnb-balloon-pump-production.up.railway.app`.

## Solution
I've updated the CORS configuration in the relayer service to allow your Vercel domain.

## 🚀 Quick Fix Steps

### 1. Update Railway Environment Variables
Go to your Railway dashboard for the relayer service and update the `CORS_ORIGINS` environment variable:

```
CORS_ORIGINS=https://bnb-balloon-pump-gamma.vercel.app,https://bnb-balloon-pump-ljrr97rtz-trislits-projects.vercel.app,http://localhost:3000
```

### 2. Redeploy the Relayer Service
The relayer service will automatically redeploy when you update the environment variable.

### 3. Verify the Fix
Check the relayer logs to see the CORS configuration:
```bash
# Check Railway logs
railway logs --service relayer
```

You should see:
```
🔧 CORS Configuration: {
  CORS_ORIGINS: "https://bnb-balloon-pump-gamma.vercel.app,https://bnb-balloon-pump-ljrr97rtz-trislits-projects.vercel.app,http://localhost:3000",
  parsedOrigins: ["https://bnb-balloon-pump-gamma.vercel.app", "https://bnb-balloon-pump-ljrr97rtz-trislits-projects.vercel.app", "http://localhost:3000"],
  NODE_ENV: "production"
}
```

### 4. Test the Frontend
Refresh your frontend at `https://bnb-balloon-pump-ljrr97rtz-trislits-projects.vercel.app` and the CORS errors should be resolved.

## 🔧 What I Fixed

1. **Updated CORS Configuration**: Added your specific Vercel domain to the allowed origins
2. **Dynamic Origin Support**: Added support for any `.vercel.app` domain
3. **Better Error Logging**: Added logging for blocked origins to help debug future issues

## 📋 Environment Variables to Set

In Railway dashboard, set:
```
CORS_ORIGINS=https://bnb-balloon-pump-gamma.vercel.app,https://bnb-balloon-pump-ljrr97rtz-trislits-projects.vercel.app,http://localhost:3000
```

## ✅ Expected Result

After updating the environment variable and redeploying:
- ✅ Frontend can fetch game state
- ✅ Frontend can fetch user balance  
- ✅ Frontend can fetch payout percentages
- ✅ Frontend can fetch leaderboard
- ✅ Vault deposit/withdraw works
- ✅ No more CORS errors in browser console

## 🚨 If Still Not Working

1. **Check Railway Logs**: Look for CORS configuration logs
2. **Verify Environment Variable**: Make sure it's set correctly in Railway
3. **Clear Browser Cache**: Hard refresh the frontend
4. **Check Network Tab**: Verify the requests are going to the right URL

The fix should resolve all the CORS errors you're seeing! 🎉

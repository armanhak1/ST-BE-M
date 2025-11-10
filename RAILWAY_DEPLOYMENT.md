# 🚂 Railway Deployment Guide

## Fixed Issues ✅

1. **Webhook Mode**: Bot now uses webhooks instead of polling (Railway compatible)
2. **Dynamic Port**: Server uses `process.env.PORT` for Railway's dynamic ports
3. **CORS Fixed**: Removed origin restrictions
4. **API URL**: Bot can call the deployed backend instead of localhost
5. **Timeout Handling**: Added 2-minute timeout to prevent 502 errors

## 📋 Environment Variables to Set in Railway

Go to your Railway dashboard → Your project → Variables, and add:

### Required Variables:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
OPENAI_API_KEY=your_openai_api_key
API_URL=https://st-be-m-production.up.railway.app
WEBHOOK_DOMAIN=https://st-be-m-production.up.railway.app
```

⚠️ **IMPORTANT**: Replace `https://st-be-m-production.up.railway.app` with your actual Railway URL if different.

### Optional Variables:

```env
PORT=8080
```
(Railway usually sets this automatically)

## 🚀 Deployment Steps

### Step 1: Push Your Code

```bash
git add .
git commit -m "Fix: Switch to webhook mode and add timeout handling"
git push origin main
```

### Step 2: Set Environment Variables in Railway

1. Open [Railway Dashboard](https://railway.app/)
2. Go to your project: **st-be-m-production**
3. Click on **Variables** tab
4. Add each variable one by one:
   - Click **"+ New Variable"**
   - Enter variable name and value
   - Click **"Add"**

### Step 3: Redeploy

Railway will automatically redeploy when you push code. If not:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment

### Step 4: Verify Deployment

1. **Check Health**: Visit `https://st-be-m-production.up.railway.app/health` in your browser
   - You should see: `{"status":"healthy","timestamp":"...","uptime":"...","service":"Wells Fargo Statement Generator API",...}`

2. **Check Logs**: In Railway dashboard → **Deployments** → Click latest deployment → **View Logs**
   - Look for: `✅ Webhook configured successfully!`
   - Should NOT see: `Bot launch timeout` or `502` errors

3. **Test Bot**: Open Telegram → Search for your bot → Send `/start`

## 🔍 Expected Log Output (Successful)

```
🚀 Server running on port 8080
🔄 Testing bot token...
✅ Bot verified: @la_st_xabs_bot (statement_bot)
🔄 Setting up webhook at: https://st-be-m-production.up.railway.app/telegram-webhook/YOUR_TOKEN
✅ Webhook configured successfully!
   URL: https://st-be-m-production.up.railway.app/telegram-webhook/YOUR_TOKEN
   Pending updates: 0
```

## 🐛 Troubleshooting

### Problem: Still seeing "Bot launch timeout"

**Solution**: Make sure `WEBHOOK_DOMAIN` is set in Railway variables.

### Problem: 502 Bad Gateway errors

**Solution**: 
1. Check that `API_URL` is set correctly in Railway variables
2. Check Railway logs for actual error messages
3. Verify OpenAI API key is valid and has credits

### Problem: Bot not responding to messages

**Solution**:
1. Verify webhook is set: In Railway logs, look for "✅ Webhook configured successfully!"
2. Check that your Railway URL is accessible (visit the /health endpoint)
3. Make sure both `TELEGRAM_BOT_TOKEN` and `WEBHOOK_DOMAIN` are set

### Problem: "Application failed to respond"

**Solution**:
- This usually means the app timed out
- Check Railway logs for the actual error
- The timeout is now set to 2 minutes for AI generation
- Make sure your OpenAI API key is working

## 📱 Testing Your Bot

Once deployed, test these commands:

1. **`/start`** - Start the interactive flow
   - Follow all prompts
   - Wait for PDF generation (may take 30-60 seconds)

2. **`/cancel`** - Cancel current operation

## 🔐 Security Note

Never commit these files:
- `.env`
- Any file containing API keys or tokens

Your `.gitignore` already protects `.env` files.

## 🎯 What Changed in This Fix

### `src/index.ts`
- Added `WEBHOOK_DOMAIN` environment variable
- Bot now uses webhooks in production (when `WEBHOOK_DOMAIN` is set)
- Bot falls back to polling in development (when `WEBHOOK_DOMAIN` is not set)
- Webhook endpoint: `/telegram-webhook/{BOT_TOKEN}`

### `src/bot.ts`
- Bot now reads `API_URL` from environment variable
- Falls back to `http://localhost:3000` in development

### `src/ai.ts`
- Added timeout handling (default: 2 minutes)
- Prevents hanging requests that cause 502 errors

---

## ✅ Final Checklist

- [ ] Code pushed to GitHub
- [ ] `TELEGRAM_BOT_TOKEN` set in Railway
- [ ] `OPENAI_API_KEY` set in Railway
- [ ] `API_URL` set to your Railway URL
- [ ] `WEBHOOK_DOMAIN` set to your Railway URL
- [ ] Deployment successful (check Railway logs)
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Bot responds to `/start` command in Telegram

**Your bot should now work from anywhere! 🎉**


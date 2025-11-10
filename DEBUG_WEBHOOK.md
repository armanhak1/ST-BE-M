# 🔍 Webhook Debugging Guide

## Step-by-Step Debugging Process

### Step 1: Push the Latest Code

```bash
git add .
git commit -m "Add webhook debugging and logging"
git push origin main
```

Wait for Railway to redeploy (usually 1-2 minutes).

---

### Step 2: Check Health Endpoint

Visit in your browser:
```
https://st-be-m-production.up.railway.app/health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "environment": {
    "openai_configured": true,
    "telegram_bot_configured": true,
    "webhook_domain": "https://st-be-m-production.up.railway.app",
    "api_url": "https://st-be-m-production.up.railway.app"
  }
}
```

✅ **If webhook_domain shows "not set"** → You forgot to set `WEBHOOK_DOMAIN` in Railway variables!

---

### Step 3: Check Webhook Status

Visit in your browser:
```
https://st-be-m-production.up.railway.app/test-webhook
```

**Expected Output:**
```json
{
  "webhook_url": "https://st-be-m-production.up.railway.app/telegram-webhook",
  "pending_update_count": 0,
  "last_error_message": null,
  "allowed_updates": ["message", "callback_query"]
}
```

❌ **Common Issues:**

1. **`webhook_url` is empty or different** → Webhook not set correctly
2. **`last_error_message` is not null** → Shows the actual error from Telegram
3. **`pending_update_count` > 0** → Messages are queued but not being delivered

---

### Step 4: Check Railway Logs

In Railway Dashboard → Deployments → View Logs

**Look for these lines:**

✅ **Good signs:**
```
📍 Webhook endpoint registered at: /telegram-webhook
🚀 Server running on port 8080
✅ Bot verified: @la_st_xabs_bot (statement_bot)
✅ Webhook configured successfully!
```

❌ **Bad signs:**
```
Bot not initialized
Error setting webhook
401 Unauthorized
```

---

### Step 5: Test the Bot in Telegram

1. Open Telegram
2. Search for your bot: `@la_st_xabs_bot`
3. Send: `/start`

---

### Step 6: Check Logs Again After Sending /start

**In Railway logs, you should see:**

```
📥 Received webhook request
📨 Received update: {
  "update_id": 123456,
  "from": "your_username",
  "message": "/start"
}
🎬 /start command received from user: your_username
✅ Sent welcome message to user: 123456
```

---

## 🐛 Common Problems & Solutions

### Problem 1: No logs when sending `/start`

**Symptom:** You send `/start` but Railway logs show nothing.

**Possible Causes:**
1. Webhook not pointing to your Railway URL
2. `WEBHOOK_DOMAIN` not set in Railway
3. Firewall blocking Telegram

**Solution:**
```bash
# Check webhook info
curl https://st-be-m-production.up.railway.app/test-webhook
```

Look at `webhook_url` - it MUST be your Railway domain.

**Fix:** Set `WEBHOOK_DOMAIN` in Railway variables and redeploy.

---

### Problem 2: Getting webhook errors in `/test-webhook`

**Symptom:** `last_error_message` shows an error.

**Common errors:**

1. **"Connection timed out"** or **"Connection refused"**
   - Your Railway app is down or not responding
   - Check Railway logs for crashes

2. **"Wrong response from the webhook: 500"**
   - Your webhook endpoint is crashing
   - Check Railway logs for the actual error

3. **"Can't parse entities"**
   - Your bot is sending malformed messages
   - Usually fixed automatically

**Solution:** Check Railway logs for the actual error when webhook is called.

---

### Problem 3: Bot responds but `/start` doesn't work

**Symptom:** Bot shows online, but `/start` does nothing.

**Possible Causes:**
1. Command handler not registered
2. Bot middleware blocking the command
3. Error in the start handler

**Solution:** Check Railway logs when you send `/start` - you should see the logging.

---

### Problem 4: "Bot not initialized" error

**Symptom:** `/test-webhook` returns `{"error": "Bot not initialized"}`

**Cause:** `TELEGRAM_BOT_TOKEN` not set in Railway.

**Solution:** 
1. Go to Railway → Variables
2. Add `TELEGRAM_BOT_TOKEN`
3. Redeploy

---

### Problem 5: Webhook keeps resetting to empty

**Symptom:** Webhook URL becomes empty after some time.

**Cause:** Another instance or service is clearing the webhook.

**Solution:**
1. Make sure you're not running the bot locally at the same time
2. Check if another Railway deployment is running
3. Manually reset webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://st-be-m-production.up.railway.app/telegram-webhook"
   ```

---

## 🔧 Manual Webhook Reset (Last Resort)

If nothing works, manually reset the webhook:

### Step 1: Delete current webhook
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook?drop_pending_updates=true"
```

### Step 2: Set new webhook
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://st-be-m-production.up.railway.app/telegram-webhook&drop_pending_updates=true"
```

### Step 3: Verify
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

---

## 📋 Environment Variables Checklist

Make sure ALL of these are set in Railway:

- [ ] `TELEGRAM_BOT_TOKEN` - Your bot token from BotFather
- [ ] `OPENAI_API_KEY` - Your OpenAI API key
- [ ] `WEBHOOK_DOMAIN` - `https://st-be-m-production.up.railway.app`
- [ ] `API_URL` - `https://st-be-m-production.up.railway.app`

---

## 📞 Still Not Working?

Share these with me:

1. **Output from `/health` endpoint**
2. **Output from `/test-webhook` endpoint**
3. **Railway logs** (last 50 lines)
4. **What happens when you send `/start`** (screenshot if possible)

This will help me identify the exact issue!


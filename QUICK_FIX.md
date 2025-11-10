# 🚨 Quick Fix for 404 Webhook Error

## The 404 error means: Bot token not found or invalid

## ✅ Step-by-Step Fix:

### 1. First, DEPLOY the new code:

```bash
cd "Backend SM"
git add .
git commit -m "Add webhook debugging"
git push origin main
```

**Wait 2 minutes** for Railway to finish deploying.

---

### 2. Set Environment Variables in Railway

Go to: Railway Dashboard → Your Project → **Variables** tab

**Add these 4 variables:**

```
Variable Name: TELEGRAM_BOT_TOKEN
Value: (paste your bot token from BotFather)

Variable Name: OPENAI_API_KEY  
Value: (paste your OpenAI API key)

Variable Name: WEBHOOK_DOMAIN
Value: https://st-be-m-production.up.railway.app

Variable Name: API_URL
Value: https://st-be-m-production.up.railway.app
```

⚠️ **Make sure there are NO spaces before or after the values!**

After adding all 4, Railway should automatically redeploy.

---

### 3. Test the Health Endpoint

Open this in your browser:
```
https://st-be-m-production.up.railway.app/health
```

**You should see:**
```json
{
  "status": "healthy",
  "environment": {
    "telegram_bot_configured": true,
    "webhook_domain": "https://st-be-m-production.up.railway.app",
    "api_url": "https://st-be-m-production.up.railway.app"
  }
}
```

❌ **If you see `false` or "not set"**, the variables aren't configured correctly.

---

### 4. Check Webhook Status

Open this in your browser:
```
https://st-be-m-production.up.railway.app/test-webhook
```

**Good response:**
```json
{
  "webhook_url": "https://st-be-m-production.up.railway.app/telegram-webhook",
  "pending_update_count": 0,
  "last_error_message": null
}
```

**Bad response (current):**
```json
{"ok":false,"error_code":404,"description":"Not Found"}
```
This means bot token is missing or invalid.

---

### 5. Get Your Bot Token from BotFather

1. Open Telegram
2. Search for `@BotFather`
3. Send: `/mybots`
4. Select your bot
5. Click **"API Token"**
6. Copy the full token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

---

### 6. Add Token to Railway

1. Railway Dashboard → Variables
2. Find `TELEGRAM_BOT_TOKEN`
3. Click Edit
4. Paste the FULL token
5. Save

Railway will redeploy automatically.

---

### 7. Test Again

After Railway finishes deploying (1-2 minutes):

**Test 1:** Open browser:
```
https://st-be-m-production.up.railway.app/health
```

Check: `"telegram_bot_configured": true`

**Test 2:** Open browser:
```
https://st-be-m-production.up.railway.app/test-webhook
```

Should show your webhook URL.

**Test 3:** Open Telegram and send `/start` to your bot

---

## 🔍 Still Getting 404?

### Check Bot Token Format:

✅ **Correct format:**
```
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-1234567890
```

❌ **Wrong:**
- Has spaces
- Is incomplete
- Has quotes around it

### Verify in Railway:

1. Go to Railway → Variables
2. Click on `TELEGRAM_BOT_TOKEN` to view it
3. Make sure it's the complete token with no extra characters

---

## 📸 What to Share if Still Not Working:

1. Screenshot of your Railway Variables page (blur the actual token values)
2. Output from: `https://st-be-m-production.up.railway.app/health`
3. Railway logs (last 20 lines)

This will help me see exactly what's wrong!


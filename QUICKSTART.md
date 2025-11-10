# Quick Start Guide

Get your Bank Statement Generator Bot running in 5 minutes!

## 🚀 Local Setup (5 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Create `.env` File
Create a `.env` file in the root directory:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

**Get Telegram Bot Token:**
- Open Telegram → Search `@BotFather`
- Send `/newbot` → Follow instructions
- Copy the token

**Get OpenAI API Key (Optional):**
- Only needed for `/start` command (AI-generated statements)
- `/mock` command works without it!
- Get it from: https://platform.openai.com/api-keys

### 3. Build
```bash
npm run build
```

### 4. Start Server
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### 5. Test the Bot
1. Open Telegram
2. Search for your bot
3. Send `/mock` to get instant mock PDF (no API needed!)
4. Or send `/start` for custom statement (needs OpenAI)

## ✅ That's It!

Your bot is now running. Check the console for:
- `🚀 Server running on http://localhost:3000`
- `🤖 Telegram bot is running!`

## 📱 Bot Commands

- `/mock` - Get mock PDF instantly (no API needed)
- `/start` - Generate custom statement (needs OpenAI)
- `/cancel` - Cancel current operation

## 🚢 Want to Deploy?

See `DEPLOYMENT.md` for detailed deployment instructions to:
- Railway
- Heroku
- DigitalOcean
- VPS
- Docker

---

**Need Help?** Check `DEPLOYMENT.md` for troubleshooting and detailed setup.


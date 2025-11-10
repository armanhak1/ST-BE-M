# Deployment Guide

This guide will help you deploy and use the Bank Statement Generator Bot.

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- OpenAI API Key (optional, only needed for AI-generated statements)

## 🚀 Quick Start

### 1. Clone/Download the Project

```bash
cd "Backend SM"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

**How to get a Telegram Bot Token:**
1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the token provided

**How to get an OpenAI API Key:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key

### 4. Build the Project

```bash
npm run build
```

### 5. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or the PORT you specified).

## 📱 Using the Telegram Bot

### Available Commands

1. **`/start`** - Start the interactive flow to generate a custom bank statement
   - You'll be prompted for:
     - Month
     - Year
     - Starting balance
     - Withdrawal target
     - Ending balance target
     - Minimum transactions
     - Card last 4 digits
     - Include reference numbers (yes/no)

2. **`/mock`** - Generate a PDF with pre-made mock data (no API calls needed)
   - This is perfect for testing and doesn't require OpenAI API

3. **`/cancel`** - Cancel the current operation

### Example Usage

1. Open Telegram and search for your bot
2. Send `/start` to begin
3. Follow the prompts, or use `/mock` for instant mock data
4. Receive your PDF bank statement!

## 🌐 API Endpoints

The server also exposes REST API endpoints:

### POST `/generate`
Generate a bank statement using AI.

**Request Body:**
```json
{
  "month": "October",
  "year": 2025,
  "starting_balance": 2000,
  "withdrawal_target": 5000,
  "ending_balance_target": 1000,
  "min_transactions": 65,
  "card_last4": "8832",
  "include_refs": true
}
```

**Response:**
Returns the generated statement data in JSON format.

### POST `/summary`
Get only the summary of a statement (without full transactions).

**Request Body:**
```json
{
  "month": "October",
  "year": 2025
}
```

## 🚢 Deployment Options

### Option 1: Railway (Recommended for Beginners)

1. Go to [Railway.app](https://railway.app/)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables in the dashboard:
   - `TELEGRAM_BOT_TOKEN`
   - `OPENAI_API_KEY`
   - `PORT` (optional, Railway sets this automatically)
6. Railway will automatically deploy and provide a URL

### Option 2: Heroku

1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment variables:
   ```bash
   heroku config:set TELEGRAM_BOT_TOKEN=your_token
   heroku config:set OPENAI_API_KEY=your_key
   ```
5. Deploy: `git push heroku main`
6. Scale: `heroku ps:scale web=1`

### Option 3: DigitalOcean App Platform

1. Go to [DigitalOcean](https://www.digitalocean.com/)
2. Create a new App
3. Connect your GitHub repository
4. Set environment variables in the dashboard
5. Deploy!

### Option 4: VPS (Ubuntu/Debian)

1. SSH into your VPS
2. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. Clone your repository
4. Install dependencies: `npm install`
5. Set up environment variables
6. Use PM2 to keep it running:
   ```bash
   npm install -g pm2
   npm run build
   pm2 start dist/index.js --name bank-statement-bot
   pm2 save
   pm2 startup
   ```

### Option 5: Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:
```bash
docker build -t bank-statement-bot .
docker run -d -p 3000:3000 --env-file .env bank-statement-bot
```

## 🔒 Security Notes

⚠️ **Important:** 
- Never commit your `.env` file to Git
- Remove hardcoded API keys from `src/index.ts` (lines 43 and 75)
- Use environment variables for all sensitive data
- Keep your Telegram bot token secret

## 🐛 Troubleshooting

### Bot not responding?
- Check that `TELEGRAM_BOT_TOKEN` is set correctly
- Verify the bot is running: `npm run dev` or `npm start`
- Check server logs for errors

### PDF generation fails?
- Ensure all dependencies are installed: `npm install`
- Check that `pdfkit` is properly installed
- Verify the data structure matches `AutoResponse` interface

### OpenAI API errors?
- Verify your API key is valid
- Check your OpenAI account has credits
- For `/mock` command, OpenAI is not needed

### Port already in use?
- Change `PORT` in `.env` file
- Or kill the process using the port:
  ```bash
  # Find process
  lsof -i :3000
  # Kill it
  kill -9 <PID>
  ```

## 📝 Project Structure

```
Backend SM/
├── src/
│   ├── index.ts          # Express server & bot initialization
│   ├── bot.ts            # Telegram bot logic
│   ├── ai.ts             # OpenAI integration
│   ├── pdfGenerator.ts   # PDF generation
│   └── mockData.ts       # Mock data for /mock command
├── dist/                 # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
└── .env                  # Environment variables (create this)
```

## 🎯 Next Steps

1. Deploy to your chosen platform
2. Test with `/mock` command first
3. Test with `/start` for full flow
4. Monitor logs for any issues
5. Set up error monitoring (optional)

## 📞 Support

If you encounter issues:
1. Check the logs
2. Verify environment variables
3. Ensure all dependencies are installed
4. Check that Node.js version is 18+

---

**Happy Deploying! 🚀**


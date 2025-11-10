# Telegram Bot Setup Guide

## Prerequisites

1. Create a Telegram bot by talking to [@BotFather](https://t.me/BotFather) on Telegram
2. Get your bot token from BotFather
3. Make sure your backend server is running on `http://localhost:3000`

## Setup

1. Create a `.env` file in the root directory:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

2. Install dependencies (if not already installed):

```bash
npm install
```

3. Start the server:

```bash
npm run dev
```

## Usage

1. Open Telegram and search for your bot
2. Send `/start` to begin
3. Follow the prompts:
   - Select a month from the keyboard
   - Enter the year (e.g., 2025)
   - Enter starting balance (e.g., 2000)
   - Enter withdrawal target (e.g., 5000)
   - Enter ending balance target (e.g., 1000)
   - Enter minimum transactions (e.g., 65)
   - Enter card last 4 digits (e.g., 8832)
   - Answer yes/no for including reference numbers

4. The bot will:
   - Call the `/generate` API endpoint with your data
   - Generate a PDF matching the React app design
   - Send the PDF file to you

## Commands

- `/start` - Start the bot and begin generating a statement
- `/cancel` - Cancel the current operation and start over

## Features

- Interactive conversation flow to collect all required fields
- Validates user input (numbers, dates, etc.)
- Generates PDF matching the React app design exactly
- Sends PDF directly to user via Telegram


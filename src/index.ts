// index.ts
import express from "express";
import cors from "cors";
import { generateStatementAI } from "./ai";
import { createBot } from "./bot";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

// First API endpoint: Generate full statement
app.post("/generate", async (req, res) => {
  try {
    // Read from request body - use user-provided data or defaults
    const {
      month = "September",
      year = 2025,
      starting_balance = 2000,
      withdrawal_target = 5000,
      ending_balance_target = 1000,
      min_transactions = 65,
      card_last4 = "8832",
      include_refs = true,
    } = req.body;

    console.log("API Call - /generate:", req.body);
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables." 
      });
    }
    
    // Generate statement using the AI module with user-provided data
    const result = await generateStatementAI(
      {
        month: month,
        year: year,
        starting_balance: starting_balance,
        withdrawal_target: withdrawal_target,
        ending_balance_target: ending_balance_target,
        min_transactions: min_transactions,
        card_last4: card_last4,
        include_refs: include_refs,
      },
      { apiKey: process.env.OPENAI_API_KEY }
    );
    // Send back the generated transactions
    res.json(result);
  } catch (err) {
    console.error("Error generating statement:", err);
    res.status(500).json({ error: "Failed to generate statement" });
  }
});

// Second API endpoint: Get statement summary only
app.post("/summary", async (req, res) => {
  try {
    const {
      month = "September",
      year = 2025,
    } = req.body;

    console.log("API Call 2 - /summary:", req.body);
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables." 
      });
    }
    
    // Generate statement using the AI module
    const result = await generateStatementAI(
      {
        month: month,
        year: year,
        starting_balance: 2000,
        withdrawal_target: 5000,
        ending_balance_target: 1000,
        min_transactions: 65,
        card_last4: "8832",
        include_refs: true,
      },
      { apiKey: "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" }
    );
    
    // Return only summary data (no transactions array)
    const summary = {
      period: result.statement.period,
      starting_balance: result.statement.starting_balance,
      totals: result.statement.totals,
      labels: result.statement.labels,
    };
    
    res.json(summary);
  } catch (err) {
    console.error("Error generating summary:", err);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Initialize Telegram Bot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let botInstance: any = null;

if (TELEGRAM_BOT_TOKEN) {
  // Launch bot asynchronously to avoid blocking server startup
  (async () => {
    try {
      botInstance = createBot(TELEGRAM_BOT_TOKEN);
      
      console.log("🔄 Testing bot token...");
      
      // First, test the connection with getMe
      const testConnection = botInstance.telegram.getMe();
      const testTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Connection test timeout")), 10000);
      });
      
      const botInfo = await Promise.race([testConnection, testTimeout]);
      console.log(`✅ Bot verified: @${botInfo.username} (${botInfo.first_name})`);
      
      console.log("🔄 Starting bot with polling...");
      
      // Launch bot - launch() starts the polling loop
      // It resolves once the bot is ready, but may take time on first connection
      const launchPromise = botInstance.launch({
        allowedUpdates: ['message', 'callback_query'],
        dropPendingUpdates: true,
      });
      
      // Set a reasonable timeout (90 seconds) for the initial connection
      const launchTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Bot launch timeout - check network connection")), 90000);
      });
      
      // Wait for launch to complete or timeout
      await Promise.race([launchPromise, launchTimeout]);
      console.log("🤖 Telegram bot is running and polling for updates!");
    } catch (err: any) {
      console.error("Error starting Telegram bot:", err);
      console.error("Error details:", err.message);
      
      if (err.message.includes("timeout") || err.message.includes("Timeout")) {
        console.error("⚠️  Connection timeout. Possible causes:");
        console.error("   - Network connectivity issue");
        console.error("   - Telegram API might be slow or unreachable");
        console.error("   - Firewall/proxy blocking Telegram");
        console.error("   - Try: curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe");
      }
      if (err.message.includes("401") || err.message.includes("Unauthorized")) {
        console.error("⚠️  Invalid bot token. Please check your TELEGRAM_BOT_TOKEN in .env file.");
        console.error("   Get a new token from @BotFather on Telegram");
      }
      if (err.message.includes("ETIMEDOUT") || err.message.includes("ENOTFOUND")) {
        console.error("⚠️  Network error. Check your internet connection and DNS settings.");
      }
      
      // Don't exit - let the server continue running
      console.warn("⚠️  Bot failed to start, but server will continue running.");
      botInstance = null;
    }
  })();
  
  // Graceful shutdown (set up regardless of bot launch status)
  process.once("SIGINT", () => {
    console.log("Shutting down...");
    if (botInstance) {
      botInstance.stop("SIGINT");
    }
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    console.log("Shutting down...");
    if (botInstance) {
      botInstance.stop("SIGTERM");
    }
    process.exit(0);
  });
} else {
  console.warn("⚠️  TELEGRAM_BOT_TOKEN not found in environment variables. Bot will not start.");
}

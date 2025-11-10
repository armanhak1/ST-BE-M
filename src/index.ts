// index.ts
import express from "express";
import cors from "cors";
import { generateStatementAI } from "./ai";
import { createBot } from "./bot";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors()); // Allow all origins in production - or configure based on environment

// Store server start time for uptime calculation
const serverStartTime = Date.now();

// Initialize Telegram Bot variables (must be before endpoints that use them)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
const WEBHOOK_PATH = "/telegram-webhook";
let botInstance: any = null;

// Root endpoint - simplest possible test
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Bank Statement Generator API",
    endpoints: ["/health", "/test-webhook", "/generate", "/telegram-webhook"]
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000); // in seconds
  const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;
  
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: uptimeFormatted,
    uptimeSeconds: uptime,
    service: "Wells Fargo Statement Generator API",
    version: "1.0.0",
    endpoints: {
      generate: "/generate (POST)",
      summary: "/summary (POST)",
      health: "/health (GET)",
      webhook: "/telegram-webhook (POST)",
    },
    environment: {
      openai_configured: !!process.env.OPENAI_API_KEY,
      telegram_bot_configured: !!process.env.TELEGRAM_BOT_TOKEN,
      webhook_domain: process.env.WEBHOOK_DOMAIN || 'not set',
      api_url: process.env.API_URL || 'not set',
    },
  };
  
  res.status(200).json(healthStatus);
});

// Test endpoint to check webhook connectivity
app.get("/test-webhook", async (req, res) => {
  if (!TELEGRAM_BOT_TOKEN || !botInstance) {
    return res.status(500).json({ error: "Bot not initialized" });
  }
  
  try {
    const webhookInfo = await botInstance.telegram.getWebhookInfo();
    res.json({
      webhook_url: webhookInfo.url,
      has_custom_certificate: webhookInfo.has_custom_certificate,
      pending_update_count: webhookInfo.pending_update_count,
      last_error_date: webhookInfo.last_error_date,
      last_error_message: webhookInfo.last_error_message,
      max_connections: webhookInfo.max_connections,
      allowed_updates: webhookInfo.allowed_updates,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
      full_name,
      address,
      mobile_deposit_business = null,
      mobile_deposit_amount = null,
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
        full_name: full_name,
        address: address,
        mobile_deposit_business: mobile_deposit_business,
        mobile_deposit_amount: mobile_deposit_amount,
      },
      { apiKey: process.env.OPENAI_API_KEY }
    );
    // Send back the generated transactions with user info
    res.json({
      ...result,
      user_info: {
        full_name,
        address,
      }
    });
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
      { apiKey: process.env.OPENAI_API_KEY }
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


// Set up Telegram Bot
if (TELEGRAM_BOT_TOKEN) {
  botInstance = createBot(TELEGRAM_BOT_TOKEN);
  
  // Webhook endpoint for Telegram to send updates
  // This must be registered BEFORE server starts listening
  app.post(WEBHOOK_PATH, async (req, res) => {
    console.log(`📥 Received webhook request`);
    console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`Body:`, JSON.stringify(req.body, null, 2));
    try {
      await botInstance.handleUpdate(req.body, res);
    } catch (err) {
      console.error('❌ Error handling webhook:', err);
      res.status(500).send('Error');
    }
  });
  
  console.log(`📍 Webhook endpoint registered at: ${WEBHOOK_PATH}`);
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0'; // Listen on all network interfaces (required for Railway)

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  
  // Set up webhook AFTER server is listening
  if (TELEGRAM_BOT_TOKEN && botInstance) {
    (async () => {
      try {
        console.log("🔄 Testing bot token...");
        const botInfo = await botInstance.telegram.getMe();
        console.log(`✅ Bot verified: @${botInfo.username} (${botInfo.first_name})`);
        
        // Use webhook if WEBHOOK_DOMAIN is set (production), otherwise use polling (development)
        if (WEBHOOK_DOMAIN) {
          const webhookUrl = `${WEBHOOK_DOMAIN}${WEBHOOK_PATH}`;
          console.log(`🔄 Setting up webhook at: ${webhookUrl}`);
          
          await botInstance.telegram.setWebhook(webhookUrl, {
            drop_pending_updates: true,
            allowed_updates: ['message', 'callback_query']
          });
          
          const webhookInfo = await botInstance.telegram.getWebhookInfo();
          console.log(`✅ Webhook configured successfully!`);
          console.log(`   URL: ${webhookInfo.url}`);
          console.log(`   Pending updates: ${webhookInfo.pending_update_count}`);
        } else {
          // Development mode: use polling
          console.log("🔄 Starting bot with polling (development mode)...");
          await botInstance.launch({
            allowedUpdates: ['message', 'callback_query'],
            dropPendingUpdates: true,
          });
          console.log("🤖 Telegram bot is running with polling!");
        }
      } catch (err: any) {
        console.error("❌ Error starting Telegram bot:", err);
        console.error("Error details:", err.message);
        
        if (err.message.includes("401") || err.message.includes("Unauthorized")) {
          console.error("⚠️  Invalid bot token. Please check your TELEGRAM_BOT_TOKEN in .env file.");
        }
        
        console.warn("⚠️  Bot failed to start, but server will continue running.");
        botInstance = null;
      }
    })();
  } else if (!TELEGRAM_BOT_TOKEN) {
    console.warn("⚠️  TELEGRAM_BOT_TOKEN not found in environment variables. Bot will not start.");
  }
});

// Graceful shutdown
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

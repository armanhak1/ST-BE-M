import { Telegraf, Context, Markup } from "telegraf";
import axios from "axios";
import { generatePDF } from "./pdfGenerator";

interface UserData {
  month?: string;
  year?: number;
  starting_balance?: number;
  withdrawal_target?: number;
  ending_balance_target?: number;
  min_transactions?: number;
  card_last4?: string;
  full_name?: string;
  address?: string;
  has_mobile_deposit?: boolean;
  mobile_deposit_business?: string;
  mobile_deposit_amount?: number;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function createBot(token: string) {
  const bot = new Telegraf(token);
  const userData: Map<number, UserData> = new Map();

  // Helper function to get or create user data
  function getUserData(userId: number): UserData {
    if (!userData.has(userId)) {
      userData.set(userId, {});
    }
    return userData.get(userId)!;
  }

  // Start command
  bot.start(async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    userData.set(userId, {});
    
    await ctx.reply(
      "👋 Welcome to the Bank Statement Generator Bot!\n\n" +
      "I'll help you generate a bank statement PDF.\n\n" +
      "Let's start by selecting the month:",
      Markup.keyboard(months.map(m => [m])).resize()
    );
  });

  // Handle month selection
  bot.hears(months, async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const month = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    if (months.includes(month)) {
      getUserData(userId).month = month;
      await ctx.reply(`✅ Month selected: ${month}\n\nPlease enter the year (e.g., 2025):`);
    }
  });

  // Handle year input
  bot.on("text", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const data = getUserData(userId);

    // Skip if it's a month selection (already handled)
    if (months.includes(text)) return;

    // Handle year
    if (data.month && !data.year) {
      const year = parseInt(text);
      if (!isNaN(year) && year >= 2000 && year <= 2100) {
        data.year = year;
        await ctx.reply(
          `✅ Year selected: ${year}\n\nPlease enter the starting balance (e.g., 2000):`
        );
        return;
      } else {
        await ctx.reply("❌ Please enter a valid year (2000-2100):");
        return;
      }
    }

    // Handle starting balance
    if (data.year && data.starting_balance === undefined) {
      const balance = parseFloat(text);
      if (!isNaN(balance) && balance >= 0) {
        data.starting_balance = balance;
        await ctx.reply(
          `✅ Starting balance: $${balance.toFixed(2)}\n\nPlease enter the withdrawal target (e.g., 5000):`
        );
        return;
      } else {
        await ctx.reply("❌ Please enter a valid number for starting balance:");
        return;
      }
    }

    // Handle withdrawal target
    if (data.starting_balance !== undefined && data.withdrawal_target === undefined) {
      const target = parseFloat(text);
      if (!isNaN(target) && target >= 0) {
        data.withdrawal_target = target;
        await ctx.reply(
          `✅ Withdrawal target: $${target.toFixed(2)}\n\nPlease enter the ending balance target (e.g., 1000):`
        );
        return;
      } else {
        await ctx.reply("❌ Please enter a valid number for withdrawal target:");
        return;
      }
    }

    // Handle ending balance target
    if (data.withdrawal_target !== undefined && data.ending_balance_target === undefined) {
      const ending = parseFloat(text);
      if (!isNaN(ending) && ending >= 0) {
        data.ending_balance_target = ending;
        await ctx.reply(
          `✅ Ending balance target: $${ending.toFixed(2)}\n\nPlease enter the minimum number of transactions (e.g., 65):`
        );
        return;
      } else {
        await ctx.reply("❌ Please enter a valid number for ending balance target:");
        return;
      }
    }

    // Handle min transactions
    if (data.ending_balance_target !== undefined && data.min_transactions === undefined) {
      const minTx = parseInt(text);
      if (!isNaN(minTx) && minTx > 0) {
        data.min_transactions = minTx;
        await ctx.reply(
          `✅ Minimum transactions: ${minTx}\n\nPlease enter the card last 4 digits (e.g., 8832):`
        );
        return;
      } else {
        await ctx.reply("❌ Please enter a valid number for minimum transactions:");
        return;
      }
    }

    // Handle card last 4
    if (data.min_transactions !== undefined && !data.card_last4) {
      const cardLast4 = text.trim();
      if (/^\d{4}$/.test(cardLast4)) {
        data.card_last4 = cardLast4;
        await ctx.reply(
          `✅ Card last 4: ${cardLast4}\n\nPlease enter your full name (e.g., JOHN DOE):`
        );
        return;
      } else {
        await ctx.reply("❌ Please enter exactly 4 digits for card number:");
        return;
      }
    }

    // Handle full name
    if (data.card_last4 && !data.full_name) {
      const fullName = text.trim().toUpperCase();
      if (fullName.length > 0) {
        data.full_name = fullName;
        await ctx.reply(
          `✅ Full name: ${fullName}\n\nPlease enter your address in format:\n` +
          `Line 1: Street Address\n` +
          `Line 2: City State ZIP\n\n` +
          `Example:\n10934 KEY WEST AVE\nPORTER RANCH CA 91326-2623`
        );
        return;
      } else {
        await ctx.reply("❌ Please enter a valid full name:");
        return;
      }
    }

    // Handle address (multi-line)
    if (data.full_name && !data.address) {
      const address = text.trim().toUpperCase();
      if (address.length > 0) {
        data.address = address;
        await ctx.reply(
          `✅ Address set!\n\nDo you want to have Mobile Deposit check from business?`,
          Markup.keyboard([["Yes", "No"]]).resize()
        );
        return;
      } else {
        await ctx.reply("❌ Please enter a valid address:");
        return;
      }
    }

    // Handle mobile deposit question
    if (data.address && data.has_mobile_deposit === undefined) {
      const response = text.toLowerCase();
      if (response === "yes" || response === "no") {
        data.has_mobile_deposit = response === "yes";
        
        if (data.has_mobile_deposit) {
          await ctx.reply(
            `✅ Great! Please enter the business name for the Mobile Deposit:`
          );
        } else {
          // Skip mobile deposit, proceed to generate
          await generateStatement(ctx, userId, data);
        }
        return;
      } else {
        await ctx.reply("❌ Please answer 'yes' or 'no':");
        return;
      }
    }

    // Handle mobile deposit business name
    if (data.has_mobile_deposit && !data.mobile_deposit_business) {
      const businessName = text.trim();
      if (businessName.length > 0) {
        data.mobile_deposit_business = businessName;
        await ctx.reply(
          `✅ Business name: ${businessName}\n\nPlease enter the check amount (e.g., 2000):`
        );
        return;
      } else {
        await ctx.reply("❌ Please enter a valid business name:");
        return;
      }
    }

    // Handle mobile deposit amount
    if (data.mobile_deposit_business && data.mobile_deposit_amount === undefined) {
      const amount = parseFloat(text);
      if (!isNaN(amount) && amount > 0) {
        data.mobile_deposit_amount = amount;
        
        // All data collected, proceed to generate
        await generateStatement(ctx, userId, data);
        return;
      } else {
        await ctx.reply("❌ Please enter a valid amount:");
        return;
      }
    }
  });

  // Helper function to generate statement
  async function generateStatement(ctx: Context, userId: number, data: UserData) {
    const summary = `
✅ All data collected!

📋 Summary:
• Month: ${data.month}
• Year: ${data.year}
• Starting Balance: $${data.starting_balance?.toFixed(2)}
• Withdrawal Target: $${data.withdrawal_target?.toFixed(2)}
• Ending Balance Target: $${data.ending_balance_target?.toFixed(2)}
• Min Transactions: ${data.min_transactions}
• Card Last 4: ${data.card_last4}
• Full Name: ${data.full_name}
• Address: ${data.address?.split('\n').join(', ')}
• Mobile Deposit: ${data.has_mobile_deposit ? `Yes (${data.mobile_deposit_business}, $${data.mobile_deposit_amount?.toFixed(2)})` : 'No'}

⏳ Generating your bank statement PDF... This may take a moment.
    `;
    
    await ctx.reply(summary);
        
    try {
      await ctx.reply("🔄 Calling API to generate statement data...");
      
      // Call the /generate endpoint with all new fields
      const response = await axios.post("http://localhost:3000/generate", {
        month: data.month,
        year: data.year,
        starting_balance: data.starting_balance,
        withdrawal_target: data.withdrawal_target,
        ending_balance_target: data.ending_balance_target,
        min_transactions: data.min_transactions,
        card_last4: data.card_last4,
        include_refs: true, // Always include references
        full_name: data.full_name,
        address: data.address,
        mobile_deposit_business: data.mobile_deposit_business,
        mobile_deposit_amount: data.mobile_deposit_amount,
      });

      await ctx.reply("📄 Generating PDF...");
      
      // Generate PDF with new fields
      const pdfBuffer = await generatePDF(response.data);
      
      await ctx.reply("📤 Sending PDF...");
      
      // Send PDF to user
      await ctx.replyWithDocument({
        source: pdfBuffer,
        filename: `bank_statement_${data.month}_${data.year}.pdf`
      });
      
      await ctx.reply(
        "✅ Your bank statement PDF has been generated and sent!\n\n" +
        "Type /start to generate another statement.",
        Markup.removeKeyboard()
      );
      
      // Clear user data
      userData.delete(userId);
    } catch (error: any) {
      console.error("Error generating statement:", error);
      await ctx.reply(
        `❌ Error generating statement: ${error.message}\n\n` +
        "Please try again with /start",
        Markup.removeKeyboard()
      );
      userData.delete(userId);
    }
  }

  // Cancel command
  bot.command("cancel", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (userId) {
      userData.delete(userId);
      await ctx.reply("❌ Cancelled. Type /start to begin again.", Markup.removeKeyboard());
    }
  });

  return bot;
}


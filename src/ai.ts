// ai-statement-autogen.ts
// One-shot AI module: the model generates LA-based POOLS (cafes, restaurants, zelle names, ATM locations, etc.)
// and the STATEMENT in a single JSON response.
// Usage: import { generateStatementAI } from "./ai-statement-autogen";
//        const data = await generateStatementAI({ ... }, { apiKey: process.env.OPENAI_API_KEY });
//
// Requires: npm i openai
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index";

/** Minimal inputs you control */
export interface AutoConfig {
  month: string;                 // e.g., "September"
  year: number;                  // e.g., 2025
  starting_balance: number;      // e.g., 2000
  withdrawal_target: number;     // e.g., 5000  (monthly spend target)
  ending_balance_target?: number; // preferred ending balance (optional if using deposit_target)
  deposit_target?: number | null; // optional alternative to ending_balance_target
  min_transactions: number;      // e.g., 60+
  card_last4: string;            // e.g., "8832"
  include_refs: boolean;         // include REF codes & mobile deposit ref numbers
  full_name?: string;            // e.g., "JOHN DOE"
  address?: string;              // e.g., "123 MAIN ST\nLOS ANGELES CA 90001"
  mobile_deposit_business?: string | null; // e.g., "ACME CORPORATION"
  mobile_deposit_amount?: number | null;   // e.g., 2000
}

/** Output shape from the model */
export interface Pools {
  cafes: string[];
  restaurants: string[];
  online_marketplaces: string[];
  recurring_merchants: string[];
  armenian_names: string[];
  russian_names: string[];
  mexican_names: string[];
  us_names: string[];
  atm_locations: { street: string; city_state: string }[];
}

export interface StatementTransaction {
  date: string;                  // "MM/DD"
  category:
    | "ZELLE_SEND"
    | "PURCHASE_CAFE"
    | "PURCHASE_RESTAURANT"
    | "PURCHASE_ONLINE_MARKETPLACE"
    | "MOBILE_CHECK_DEPOSIT"
    | "ZELLE_FROM"
    | "RECURRING_PAYMENT"
    | "ATM_WITHDRAWAL";
  type: "withdrawal" | "deposit";
  description: string;
  amount: number;
  balance_after: number;
  metadata?: {
    city?: string;
    state?: "CA";
    card_last4?: string;
    ref?: string;
    ref_number?: string;
    atm_id?: string;
  };
}

export interface StatementJSON {
  statement: {
    period: { month: string; year: number };
    starting_balance: number;
    labels: { withdrawals: "Withdrawals/Subtractions"; deposits: "Deposits/Additions" };
    totals: {
      deposits: number;
      withdrawals: number;
      ending_balance: number;
      transaction_count: number;
    };
    transactions: StatementTransaction[];
  };
}

export interface AutoResponse {
  pools: Pools;
  statement: StatementJSON["statement"];
}

/** System prompt: strict JSON only, model must generate POOLS + STATEMENT in one response */
const SYSTEM_PROMPT = `
You are a financial data generator.

Output strictly valid JSON and nothing else. No comments, no extra text.
Return a single object with two keys: "pools" and "statement".

1) First, produce Los Angeles–area POOLS that you will use:
{
  "pools": {
    "cafes": string[],                    // LA cafes
    "restaurants": string[],              // LA/SoCal restaurant names
    "online_marketplaces": string[],      // realistic e-commerce brands (Amazon, Etsy, Temu, etc.)
    "recurring_merchants": string[],      // Apple.Com/Bill, Netflix, Spotify, etc.
    "armenian_names": string[],           // given+family names
    "russian_names": string[],
    "mexican_names": string[],
    "us_names": string[],
    "atm_locations": [ { "street": string, "city_state": "City CA" }, ... ]
  }
}

2) Then, using ONLY those pools, generate a monthly checking STATEMENT object:
- Exactly these categories:
  "ZELLE_SEND", "PURCHASE_CAFE", "PURCHASE_RESTAURANT",
  "PURCHASE_ONLINE_MARKETPLACE", "MOBILE_CHECK_DEPOSIT",
  "ZELLE_FROM", "RECURRING_PAYMENT", "ATM_WITHDRAWAL"
- Date format: "MM/DD" within the given month and year. Sort ascending by date.
- Names style: mix Armenian, Russian, Mexican, and U.S. names for Zelle entries.
- Purchases end with "Card {card_last4}".
- ATM lines include street, city, "ATM ID {6 digits}", and "Card {card_last4}".
- If include_refs=true, add realistic "ref" strings and 12-digit mobile "ref_number".
- Running "balance_after" must be arithmetically correct for each transaction.
- Totals must equal the sums; transaction_count must match length.
- Amounts: mixed small/medium/few large.
- Aim withdrawals close to "withdrawal_target".
- Size deposits so ending balance ≈ "ending_balance_target" (or use "deposit_target" if provided).
- Minimum transaction count: "min_transactions" (can exceed if needed for realism).
- Labels:
  "labels": { "withdrawals": "Withdrawals/Subtractions", "deposits": "Deposits/Additions" }

Return JSON in this shape:
{
  "pools": { ... as described ... },
  "statement": {
    "period": { "month": "string", "year": 0 },
    "starting_balance": 0.00,
    "labels": {
      "withdrawals": "Withdrawals/Subtractions",
      "deposits": "Deposits/Additions"
    },
    "totals": {
      "deposits": 0.00,
      "withdrawals": 0.00,
      "ending_balance": 0.00,
      "transaction_count": 0
    },
    "transactions": [
      {
        "date": "MM/DD",
        "category": "ZELLE_SEND | PURCHASE_CAFE | PURCHASE_RESTAURANT | PURCHASE_ONLINE_MARKETPLACE | MOBILE_CHECK_DEPOSIT | ZELLE_FROM | RECURRING_PAYMENT | ATM_WITHDRAWAL",
        "type": "withdrawal | deposit",
        "description": "string",
        "amount": 0.00,
        "balance_after": 0.00,
        "metadata": {
          "city": "string (optional when available)",
          "state": "CA",
          "card_last4": "string",
          "ref": "string",
          "ref_number": "string",
          "atm_id": "string"
        }
      }
    ]
  }
}
`.trim();

/** Build user prompt with minimal variables; AI will autogenerate pools + statement */
export function buildUserPrompt(cfg: AutoConfig): string {
  return `
Generate LA-based merchant/name/ATM POOLS and a full monthly STATEMENT in a single JSON object.

VARIABLES:
- month: "${cfg.month}"
- year: ${cfg.year}
- starting_balance: ${cfg.starting_balance}
- withdrawal_target: ${cfg.withdrawal_target}
- ending_balance_target: ${cfg.ending_balance_target ?? "null"}
- deposit_target: ${cfg.deposit_target ?? "null"}
- min_transactions: ${cfg.min_transactions}
- card_last4: "${cfg.card_last4}"
- include_refs: ${cfg.include_refs}

CONSTRAINTS & FORMATS:
- Purchases:
  "Purchase authorized on MM/DD {Merchant Name} CA S{REF} Card ${cfg.card_last4}"
- Online marketplace (example pattern):
  "Purchase authorized on MM/DD Alibaba.Com Singap 408-7855580 CA S{REF} Card ${cfg.card_last4}"
- Zelle:
  "Zelle to {Full Name} on MM/DD Ref # {REF}"
  "Zelle From {Full Name} on MM/DD Ref # {REF}"
- Mobile check deposit:
  "Mobile Deposit : Ref Number :{12-digit-number} on MM/DD"
- ATM:
  "ATM Withdrawal authorized on MM/DD {street} {city_state} ATM ID {6-digits} Card ${cfg.card_last4}"

IMPORTANT CONSTRAINTS:
- Sort transactions by date ascending.
- Compute running "balance_after" sequentially and exactly.
- Ensure totals are accurate and consistent with transactions.
- Use Los Angeles area cities/places and realistic merchant/name pools you generated.
- ZELLE LIMIT: Zelle transactions (ZELLE_SEND + ZELLE_FROM) can be at most 33% of total transaction count
- RECURRING PAYMENTS: Always include at least 1 recurring payment (e.g., Apple.Com/Bill, Netflix, Spotify)
${cfg.mobile_deposit_business && cfg.mobile_deposit_amount ? `
- MOBILE DEPOSIT: Include exactly ONE mobile deposit transaction with:
  * Business name: "${cfg.mobile_deposit_business}"
  * Amount: ${cfg.mobile_deposit_amount}
  * Description format: "Mobile Deposit : Ref Number :{12-digit-number}"
  * This deposit should be included in the deposits total and affect the ending balance calculation
` : ''}
`.trim();
}

export interface GenerateOptions {
  apiKey?: string;      // pass your key or pre-configured client
  client?: OpenAI;
  model?: string;       // default: gpt-5
  temperature?: number; // default: 0.6
}

/** Core call — returns parsed JSON { pools, statement } */
export async function generateStatementAI(
  config: AutoConfig,
  options: GenerateOptions = {}
): Promise<AutoResponse> {
  const client = options.client ?? new OpenAI({ apiKey: options.apiKey });
  const model = options.model ?? "gpt-4.1-mini";
  const temperature = options.temperature ?? 0.6;


const messages: ChatCompletionMessageParam[] = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: buildUserPrompt(config) },
];
const resp = await client.chat.completions.create({
  model,
  messages,
  response_format: { type: "json_object" },
  temperature
});


  const raw = resp.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as AutoResponse;
}
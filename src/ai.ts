// ai.ts
// AI-only module to generate synthetic transactions and enrich descriptions with a premium LLM.
//
// Usage:
//   import { generateStatementAI } from "./ai";
//   const { rows, totals } = await generateStatementAI({
//     startDate: "2025-03-01",
//     endDate: "2025-03-31",
//     startBalance: 150000,
//     count: 20,
//     depositRatio: 0.25,
//     currency: "$",
//   });
//
// Env:
//   OPENAI_API_KEY=sk-...    (required for AI enrichment)
//   OPENAI_MODEL=gpt-5       (optional, defaults to a premium model)
// Notes:
//   - This produces synthetic data only. Add your own watermarking/verification in the PDF layer.

import OpenAI from "openai";

export type Txn = {
  date: string;          // "M/D"
  check: string;         // usually ""
  description: string;   // AI-enriched
  type: "deposit" | "withdrawal";
  deposit: number | "";  // numeric for deposits, "" otherwise
  withdrawal: number | "";// numeric for withdrawals, "" otherwise
  ending: number;        // running balance
};

export type GenerateInput = {
  startDate: string;     // "YYYY-MM-DD"
  endDate: string;       // "YYYY-MM-DD"
  startBalance: number;  // starting balance number
  count?: number;        // number of transactions (default 18)
  depositRatio?: number; // probability [0..1] that a row is deposit (default 0.25)
  currency?: string;     // "$", "€", etc (default "$")
  locale?: string;       // e.g., "en-US" (affects some formatting hints)
};

export type GenerateOutput = {
  rows: Txn[];
  totals: { deposits: number; withdrawals: number; endingBalance: number };
};

// ———————————————————————————————————————————————————————————
// Internals (rule-based scaffold + AI enrichment)
// ———————————————————————————————————————————————————————————
console.log(process.env.OPENAI_API_KEY_SK, process.env.OPENAI_MODEL, '@@@')
const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4.1"; // premium by default
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Lightweight date helpers (no deps)
function toDate(s: string): Date {
  const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
  return new Date(y, (m - 1), d);
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function diffDays(a: Date, b: Date): number {
  const MS = 24 * 60 * 60 * 1000;
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.max(0, Math.round((bb - aa) / MS));
}
function fmtMD(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function rand(a: number, b: number): number {
  return Math.random() * (b - a) + a;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Category pools (brand names are generic/harmless)
const WITHDRAWAL_BINS = {
  tiny: { min: 4, max: 25 },      // coffee/snacks
  small:{ min: 26, max: 85 },     // fast food, small items
  med:  { min: 90, max: 450 },    // shopping, utilities
  big:  { min: 700, max: 2500 },  // rent/auto/insurance
};
const DEPOSIT_BINS = {
  small:{ min: 15, max: 180 },    // refunds, misc
  big:  { min: 1500, max: 6500 }, // payroll / major transfer
};

const W_MERCHANTS = {
  pos:  ["Corner Coffee", "Fresh Mart", "City Fuel", "Daily Goods", "Local Market"],
  sub:  ["Streamify", "TuneBox", "CloudSuite", "PrimeShip"],
  util: ["City Power", "Metro Net", "SoCal Gas", "Water & San"],
  rest: ["Green Bowl", "Burger Hub", "Taco Spot", "Noodle Bar"],
  groc: ["Grocer One", "Ralphs Market", "Trader Place"],
};
const CITIES = ["Los Angeles CA", "Glendale CA", "Santa Monica CA", "Burbank CA"];

function baseDescription(type: "deposit" | "withdrawal", todayMD: string): string {
  if (type === "deposit") {
    const tag = Math.random() < 0.6 ? "Payroll Deposit" : pick(["Refund", "Transfer From Savings", "Cash Deposit"]);
    if (tag === "Payroll Deposit") return `Payroll Deposit ${todayMD}`;
    if (tag === "Refund") return `Card Refund ${pick(W_MERCHANTS.pos)}`;
    if (tag === "Transfer From Savings") return `Online Transfer From Savings`;
    return "Cash Deposit";
  } else {
    const bucket = pick(["POS", "ATM", "OnlineXfer", "Utility", "Subscription", "Fuel", "Restaurant", "Groceries"]);
    switch (bucket) {
      case "POS":         return `Purchase authorized on ${todayMD} ${pick(W_MERCHANTS.pos)} ${pick(CITIES)}`;
      case "ATM":         return `ATM Cash Withdrawal ${pick(CITIES)}`;
      case "OnlineXfer":  return `Online Transfer To Savings`;
      case "Utility":     return `ACH Debit ${pick(W_MERCHANTS.util)}`;
      case "Subscription":return `Card Recurring ${pick(W_MERCHANTS.sub)}`;
      case "Fuel":        return `Card Auth Fuel Station ${pick(CITIES)}`;
      case "Restaurant":  return `Card Auth ${pick(W_MERCHANTS.rest)}`;
      case "Groceries":   return `Card Auth ${pick(W_MERCHANTS.groc)}`;
      default:            return `Card Purchase ${pick(W_MERCHANTS.pos)}`;
    }
  }
}

function generateRuleRows(input: GenerateInput): Txn[] {
  const {
    startDate,
    endDate,
    startBalance,
    count = 18,
    depositRatio = 0.25,
  } = input;

  const start = toDate(startDate);
  const end = toDate(endDate);
  const span = Math.max(1, diffDays(start, end));
  let bal = startBalance;

  const raw: (Txn & { sortKey: number })[] = [];
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(rand(0, span + 1));
    const d = addDays(start, dayOffset);
    const md = fmtMD(d);

    const isDeposit = Math.random() < depositRatio;

    // amount selection
    let amt: number;
    if (isDeposit) {
      amt = Math.random() < 0.35
        ? rand(DEPOSIT_BINS.big.min, DEPOSIT_BINS.big.max)
        : rand(DEPOSIT_BINS.small.min, DEPOSIT_BINS.small.max);
    } else {
      const r = Math.random();
      if (r < 0.45) amt = rand(WITHDRAWAL_BINS.tiny.min, WITHDRAWAL_BINS.tiny.max);
      else if (r < 0.75) amt = rand(WITHDRAWAL_BINS.small.min, WITHDRAWAL_BINS.small.max);
      else if (r < 0.93) amt = rand(WITHDRAWAL_BINS.med.min, WITHDRAWAL_BINS.med.max);
      else amt = rand(WITHDRAWAL_BINS.big.min, WITHDRAWAL_BINS.big.max);
    }
    amt = Math.round(amt * 100) / 100;

    const desc = baseDescription(isDeposit ? "deposit" : "withdrawal", md);
    bal = Math.round((bal + (isDeposit ? amt : -amt)) * 100) / 100;

    raw.push({
      date: md,
      check: "",
      description: desc,
      type: isDeposit ? "deposit" : "withdrawal",
      deposit: isDeposit ? amt : "",
      withdrawal: !isDeposit ? amt : "",
      ending: bal,
      sortKey: d.getTime() + (isDeposit ? 1 : 0),
    });
  }

  raw.sort((a, b) => a.sortKey - b.sortKey);
  return raw.map(({ sortKey, ...rest }) => rest);
}

function summarize(rows: Txn[]) {
  let deposits = 0, withdrawals = 0;
  for (const r of rows) {
    if (typeof r.deposit === "number") deposits += r.deposit;
    if (typeof r.withdrawal === "number") withdrawals += r.withdrawal;
  }
  deposits = Math.round(deposits * 100) / 100;
  withdrawals = Math.round(withdrawals * 100) / 100;
  const endingBalance = rows.length ? rows[rows.length - 1].ending : 0;
  return { deposits, withdrawals, endingBalance };
}

// Batch-enrich descriptions with LLM in one call (fast & consistent)
async function enrichDescriptionsAI(rows: Txn[], locale = "en-US"): Promise<string[]> {
  if (!client.apiKey) {
    // No API key set — return original descriptions unchanged
    return rows.map(r => r.description);
  }

  // Prepare compact payload to control costs and ensure structure
  const base = rows.map((r, i) => ({
    i,
    type: r.type,
    seed: r.description,
    date: r.date,
    amount: (typeof r.deposit === "number" ? r.deposit : r.withdrawal) || 0,
    locale,
  }));

  const system = `
You are a financial data simulator producing SHORT, natural transaction descriptions for a synthetic statement.
Rules:
- Keep it realistic, concise, and neutral (max 12 words).
- No real bank names, no personal data, no sensitive info.
- Keep the meaning of the seed, improve wording/variety only.
- Keep date hints and merchant style if present.
- Output JSON array with {i, rewritten} in the SAME order and length as input.
`;

  const user = `
Rewrite these descriptions. Return ONLY valid JSON array.
${JSON.stringify(base)}
`;

  const resp = await client.chat.completions.create({
    model: MODEL, // premium model by default
    temperature: 0.7,
    messages: [
      { role: "system", content: system.trim() },
      { role: "user", content: user.trim() },
    ],
    response_format: { type: "json_object" } as any, // some SDKs use tool/JSON mode; fallback to parse
  });

  // Try parse; tolerate both array or object-wrapped array
  const text = resp.choices?.[0]?.message?.content?.trim() || "[]";
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    // If the model returned a top-level object, try common key guesses
    try {
      const m = text.match(/\[[\s\S]*\]/);
      parsed = m ? JSON.parse(m[0]) : [];
    } catch {
      parsed = [];
    }
  }

  // Normalize to array
  const arr: { i: number; rewritten: string }[] = Array.isArray(parsed)
    ? parsed
    : (parsed?.items || parsed?.data || parsed?.rows || []);

  const map = new Map<number, string>();
  for (const item of arr) {
    if (typeof item?.i === "number" && typeof item?.rewritten === "string") {
      map.set(item.i, item.rewritten.trim());
    }
  }

  return rows.map((_, i) => map.get(i) || rows[i].description);
}

// ———————————————————————————————————————————————————————————
// Public API
// ———————————————————————————————————————————————————————————

export async function generateStatementAI(input: GenerateInput): Promise<GenerateOutput> {
  const {
    currency = "$",
    locale = "en-US",
  } = input;

  // 1) Create rule-safe rows with correct math & dates
  const rows = generateRuleRows(input);

  // 2) Enrich descriptions with a premium LLM (best model)
  const enriched = await enrichDescriptionsAI(rows, locale);
  for (let i = 0; i < rows.length; i++) {
    rows[i].description = enriched[i];
  }

  // 3) Totals
  const totals = summarize(rows);

  // 4) Return; PDF rendering is a separate layer
  return { rows, totals };
}

// Optional helper if you want to quickly preview in Node (uncomment to run directly):
// (async () => {
//   const out = await generateStatementAI({
//     startDate: "2025-03-01",
//     endDate: "2025-03-31",
//     startBalance: 5000,
//     count: 20,
//     depositRatio: 0.25,
//     currency: "$",
//   });
//   console.log(JSON.stringify(out, null, 2));
// })();
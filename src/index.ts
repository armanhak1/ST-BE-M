// index.ts
import express from "express";
import cors from "cors";
import { generateStatementAI } from "./ai";

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));
// Example route
app.post("/generate", async (req, res) => {
  try {
    // Read from request body or set defaults
    const {
      startDate = "2025-03-01",
      endDate = "2025-03-31",
      startBalance = 100,
      depositRatio = 0.25,
      currency = "$",
      targetMonthlySpending = 100,
    } = req.body;

    console.log(req.body)
    // Generate statement using the AI module
const result = await generateStatementAI(
  {
    month: "September",
    year: 2025,
    starting_balance: 2000,
    withdrawal_target: 5000,
    ending_balance_target: 1000,
    min_transactions: 65,
    card_last4: "8832",
    include_refs: true,
  },
  { apiKey: "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" }
);
    // Send back the generated transactions
    res.json(result);
  } catch (err) {
    console.error("Error generating statement:", err);
    res.status(500).json({ error: "Failed to generate statement" });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

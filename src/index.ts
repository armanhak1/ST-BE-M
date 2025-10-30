// index.ts
import express from "express";
import { generateStatementAI } from "./ai";

const app = express();
app.use(express.json());

// Example route
app.post("/generate", async (req, res) => {
  try {
    // Read from request body or set defaults
    const {
      startDate = "2025-03-01",
      endDate = "2025-03-31",
      startBalance = 5000,
      count = 20,
      depositRatio = 0.25,
      currency = "$",
    } = req.body;


    // Generate statement using the AI module
    const result = await generateStatementAI({
      startDate,
      endDate,
      startBalance,
      count,
      depositRatio,
      currency,
    });

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

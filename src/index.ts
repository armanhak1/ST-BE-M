import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import OpenAI from 'openai';

const app = express();
app.use(cors());
app.use(express.json());

// --- AI client (same file) ---
const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateAIResponse(prompt: string): Promise<string> {
  const response = await ai.responses.create({
    model: 'gpt-5',
    input: prompt,
    instructions: 'You are a concise, helpful assistant for a backend API.',
  });
  return response.output_text;
}

// --- Validation ---
const BodySchema = z.object({
  prompt: z.string().min(1, 'prompt is required'),
});

// --- Route ---
app.post('/ai', async (req, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  try {
    const text = await generateAIResponse(parsed.data.prompt);
    return res.json({ ok: true, text });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err?.message ?? 'Unknown error' });
  }
});

// --- Start server ---
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
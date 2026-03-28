// ============================================================
// AI API client — server-side only
// Primary: Anthropic (Claude) per docs/DEVELOPER-GUIDE.md
// Fallback: Google Gemini if GEMINI_API_KEY is set
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4000
): Promise<ClaudeResponse> {
  // Prefer Anthropic if configured
  if (process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = res.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
      .trim();

    if (!text) throw new Error('No text response from Anthropic');

    return {
      text,
      inputTokens: res.usage?.input_tokens ?? 0,
      outputTokens: res.usage?.output_tokens ?? 0,
      model: res.model,
    };
  }

  // Fallback to Gemini for dev convenience
  if (process.env.GEMINI_API_KEY) {
    // Lazy import so the package is optional at build time.
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        // Strongly nudge valid JSON for downstream parser stability.
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(userMessage);
    const response = result.response;
    const text = response.text();
    if (!text) throw new Error('No text response from Gemini');

    const usage = response.usageMetadata;
    return {
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      model: 'gemini-2.5-flash',
    };
  }

  throw new Error('AI not configured — set ANTHROPIC_API_KEY (preferred) or GEMINI_API_KEY in .env.local');
}

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
  cacheReadTokens: number;   // tokens served from prompt cache (Anthropic only)
  cacheWriteTokens: number;  // tokens written to prompt cache (Anthropic only)
  model: string;
}

// Module-level singleton — avoids re-creating the HTTP client on every call
const _anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const TRANSIENT_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientProviderError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /503|429|Service Unavailable|high demand|temporar|overload|rate limit/i.test(msg);
}

async function withTransientRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= TRANSIENT_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retriable = isTransientProviderError(err);
      if (!retriable || attempt >= TRANSIENT_RETRIES) break;
      const backoffMs = 700 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
      console.warn(`[ai:${label}] transient error, retrying (${attempt + 1}/${TRANSIENT_RETRIES}) in ${backoffMs}ms`, err);
      await sleep(backoffMs);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4000,
  // jsonMode is enforced via prompt instructions for Anthropic — it only affects the Gemini fallback path
  jsonMode = true
): Promise<ClaudeResponse> {
  // Prefer Anthropic if configured
  if (_anthropic) {
    const res = await withTransientRetry('anthropic', () =>
      _anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }, // cache for 5 min — saves cost on retries & parallel calls
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      })
    );

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
      cacheReadTokens: res.usage?.cache_read_input_tokens ?? 0,
      cacheWriteTokens: res.usage?.cache_creation_input_tokens ?? 0,
      model: res.model,
    };
  }

  // Fallback to Gemini for dev convenience
  if (!_anthropic && process.env.GEMINI_API_KEY) {
    // Lazy import so the package is optional at build time.
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        ...(jsonMode && { responseMimeType: 'application/json' }),
      },
    });

    const result = await withTransientRetry('gemini', () => model.generateContent(userMessage));
    const response = result.response;
    const text = response.text();
    if (!text) throw new Error('No text response from Gemini');

    const usage = response.usageMetadata;
    return {
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      model: 'gemini-2.5-flash',
    };
  }

  throw new Error('AI not configured — set ANTHROPIC_API_KEY (preferred) or GEMINI_API_KEY in .env.local');
}

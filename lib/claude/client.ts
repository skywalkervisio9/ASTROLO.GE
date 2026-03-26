// ============================================================
// AI API client — server-side only
// Uses Google Gemini API (drop-in replacement for Anthropic Claude)
// Interface kept identical so pipeline.ts needs zero changes
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
  const model = genai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
    },
  });

  const result = await model.generateContent(userMessage);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error('No text response from Gemini');
  }

  const usage = response.usageMetadata;

  return {
    text,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    model: 'gemini-2.5-flash',
  };
}

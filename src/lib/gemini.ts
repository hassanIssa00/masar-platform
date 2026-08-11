import { callGeminiApi as serverCallGemini, CallGeminiOptions } from './ai/gemini.server';

export type { GeminiMessage, CallGeminiOptions } from './ai/gemini.server';

/**
 * Legacy wrapper forwarding to server-only Gemini API Engine.
 */
export async function callGeminiApi(options: CallGeminiOptions) {
  return serverCallGemini(options);
}

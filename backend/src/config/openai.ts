import OpenAI from 'openai';
import config from './env.js';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!client) {
    client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return client;
}

export const OPENAI_MODEL = 'gpt-4.1-mini';

export default getOpenAI;

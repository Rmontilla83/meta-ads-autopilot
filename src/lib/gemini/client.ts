import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { type ZodType } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Simple in-memory rate limiter
let callCount = 0;
let windowStart = Date.now();
const MAX_CALLS_PER_MINUTE = 30;

function checkRateLimit() {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    callCount = 0;
    windowStart = now;
  }
  callCount++;
  if (callCount > MAX_CALLS_PER_MINUTE) {
    throw new Error('Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.');
  }
}

export function getGeminiFlash(): GenerativeModel {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

export function getGeminiPro(): GenerativeModel {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-pro' });
}

export async function generateStructuredJSON<T>(
  model: GenerativeModel,
  systemPrompt: string,
  userMessage: string,
  schema: ZodType<T>
): Promise<T> {
  checkRateLimit();

  const fullPrompt = `${systemPrompt}

IMPORTANTE: Responde ÚNICAMENTE con JSON válido, sin markdown, sin backticks, sin texto adicional.

${userMessage}`;

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();

      // Clean potential markdown wrapping
      const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch (error) {
      if (attempts >= maxAttempts) {
        throw wrapError(error);
      }
    }
  }

  throw new Error('No se pudo generar una respuesta válida. Intenta de nuevo.');
}

export async function* streamChat(
  model: GenerativeModel,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): AsyncGenerator<string> {
  checkRateLimit();

  const contents = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const chat = model.startChat({
    history: contents.slice(0, -1),
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessageStream(userMessage);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}

function wrapError(error: unknown): Error {
  if (error instanceof Error) {
    if (error.message.includes('quota')) {
      return new Error('Se ha alcanzado el límite de la API. Intenta de nuevo en unos minutos.');
    }
    if (error.message.includes('SAFETY')) {
      return new Error('El contenido generado fue bloqueado por filtros de seguridad. Intenta reformular tu solicitud.');
    }
    if (error.message.includes('JSON')) {
      return new Error('Error al procesar la respuesta de la IA. Intenta de nuevo.');
    }
    return error;
  }
  return new Error('Error inesperado al comunicarse con la IA.');
}

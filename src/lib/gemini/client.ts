import { GoogleGenAI } from '@google/genai';
import { type ZodType } from 'zod';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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

// Model name helpers — kept as functions for backward compatibility with callers
export type GeminiModel = string;

export function getGeminiFlash(): GeminiModel {
  return 'gemini-2.5-flash';
}

export function getGeminiPro(): GeminiModel {
  return 'gemini-2.5-pro';
}

export async function generateStructuredJSON<T>(
  model: GeminiModel,
  systemPrompt: string,
  userMessage: string,
  schema: ZodType<T>
): Promise<T> {
  checkRateLimit();

  const userContent = `IMPORTANTE: Responde ÚNICAMENTE con JSON válido, sin markdown, sin backticks, sin texto adicional.

${userMessage}`;

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userContent,
        config: {
          systemInstruction: systemPrompt,
        },
      });
      const text = response.text ?? '';

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
  model: GeminiModel,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): AsyncGenerator<string> {
  checkRateLimit();

  const chatHistory = history.map((msg) => ({
    role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: msg.content }],
  }));

  const chat = ai.chats.create({
    model,
    history: chatHistory,
    config: {
      systemInstruction: systemPrompt,
    },
  });

  const stream = await chat.sendMessageStream({
    message: userMessage,
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}

export async function generateMultimodalJSON<T>(
  model: GeminiModel,
  systemPrompt: string,
  userMessage: string,
  imageParts: Array<{ inlineData: { data: string; mimeType: string } }>,
  schema: ZodType<T>
): Promise<T> {
  checkRateLimit();

  const userContent = `IMPORTANTE: Responde ÚNICAMENTE con JSON válido, sin markdown, sin backticks, sin texto adicional.

${userMessage}`;

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: userContent },
              ...imageParts,
            ],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
        },
      });
      const text = response.text ?? '';

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

export async function generateAdImage(
  prompt: string,
  aspectRatio?: string
): Promise<{ imageData: string; mimeType: string }> {
  checkRateLimit();

  const enhancedPrompt = `Create a professional advertising image for social media ads.
The image should be commercial quality, brand-safe, vibrant colors, clean composition.
IMPORTANT: Do NOT include any text overlays, watermarks, or written words in the image (Meta Ads policy).
The image should be photorealistic and suitable for a paid advertisement.

Image description: ${prompt}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: enhancedPrompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(aspectRatio ? { imageGenerationConfig: { outputImageCount: 1, aspectRatio } } : { imageGenerationConfig: { outputImageCount: 1 } }),
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error('No se recibió respuesta del modelo de generación de imágenes.');
  }

  for (const part of parts) {
    if (part.inlineData) {
      return {
        imageData: part.inlineData.data!,
        mimeType: part.inlineData.mimeType || 'image/png',
      };
    }
  }

  throw new Error('No se generó ninguna imagen. Intenta con una descripción diferente.');
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

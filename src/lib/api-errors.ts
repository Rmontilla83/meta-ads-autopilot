import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public userMessage: string
  ) {
    super(userMessage);
    this.name = 'ApiError';
  }
}

export const ERRORS = {
  UNAUTHORIZED: new ApiError(401, 'UNAUTHORIZED', 'No autorizado'),
  FORBIDDEN: new ApiError(403, 'FORBIDDEN', 'Acceso denegado'),
  NOT_FOUND: new ApiError(404, 'NOT_FOUND', 'Recurso no encontrado'),
  RATE_LIMITED: new ApiError(429, 'RATE_LIMITED', 'Demasiadas solicitudes. Intenta de nuevo en unos momentos.'),
  VALIDATION_ERROR: new ApiError(400, 'VALIDATION_ERROR', 'Datos de entrada inválidos'),
  INTERNAL_ERROR: new ApiError(500, 'INTERNAL_ERROR', 'Error interno del servidor'),
  PLAN_LIMIT: new ApiError(403, 'PLAN_LIMIT', 'Has alcanzado el límite de tu plan actual'),
  META_CONNECTION: new ApiError(400, 'META_CONNECTION', 'No se encontró una conexión activa de Meta'),
} as const;

export function handleApiError(error: unknown, context?: { route?: string; userId?: string }): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.userMessage, code: error.code },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error && error.name === 'ZodError') {
    return NextResponse.json(
      { error: 'Datos de entrada inválidos', code: 'VALIDATION_ERROR', details: (error as unknown as Record<string, unknown>).errors },
      { status: 400 }
    );
  }

  logger.error('Unhandled API error', context ?? {}, error);
  return NextResponse.json(
    { error: 'Error interno del servidor', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta de nuevo en unos momentos.', code: 'RATE_LIMITED' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    }
  );
}

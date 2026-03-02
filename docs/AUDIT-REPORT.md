# AUDITORÍA COMPLETA - Meta Ads Autopilot

**Fecha:** 2 de Marzo, 2026
**Alcance:** UX, Seguridad, Rendimiento, Código, Propuestas de Mejora

---

## PARTE 1: AUDITORÍA DE UX Y FLUJO DE USUARIO

---

### 1.1 Flujo del Usuario Principiante

#### Recorrido: Landing -> Registro -> Onboarding -> Primera Campaña

**Landing Page (`/`):**
- Hero claro con CTA "Comenzar Gratis" en amber. Buen contraste.
- Sección de 3 pasos (Conecta, Configura, Mide) explica el proceso.
- Pricing cards visibles con plan Gratis destacado.
- Guía de 6 pasos para usuarios sin cuenta de Meta Ads — excelente para principiantes.

**Puntos de confusión identificados:**

| # | Problema | Severidad | Detalle |
|---|---------|-----------|---------|
| 1 | **No hay menú hamburguesa en móvil** | CRÍTICO | Los links de navegación (Funciones, Precios, Testimonios) usan `hidden md:flex` sin drawer móvil. En teléfono solo ven Login y CTA. |
| 2 | Footer con links muertos | MEDIO | "Blog", "Soporte", "Integraciones", "Cookies" apuntan a `href="#"`. |
| 3 | Pricing sin toggle anual en landing | BAJO | La página `/pricing` tiene toggle mensual/anual pero la landing no. Inconsistencia. |
| 4 | Testimonios genéricos | BAJO | "María García", "Carlos Rodríguez", "Ana Martínez" con 5 estrellas. Pueden parecer fabricados. |

**Onboarding (5 pasos):**
- Step 1 (Negocio): Formulario claro con validación Zod en español. **Pero** la sección "Identidad de Marca" (logo, colores, tipografía) es opcional pero alarga mucho el paso. Un principiante puede sentirse abrumado.
- Step 2 (Meta): Conexión OAuth con opción de saltar — correcto.
- Step 3 (Objetivos): Presupuesto, experiencia, tono de marca — bien segmentado.
- Step 4 (Personas): Generación con IA + manual. Tiene explicación con Alert informativo. Buena UX.
- Step 5 (Resumen): Confirmación de datos.

**Problemas del onboarding:**

| # | Problema | Severidad |
|---|---------|-----------|
| 1 | No hay indicador de progreso de guardado. `saveStep()` corre silenciosamente | MEDIO |
| 2 | Si falla el guardado al completar onboarding, solo hay `console.error` — usuario queda atascado | ALTO |
| 3 | Step 1 es demasiado largo con la sección de Brand Identity | BAJO |

**Primera campaña con IA:**
- Split screen: Chat IA (40%) + Preview (60%).
- 4 botones rápidos como sugerencias iniciales — bueno para principiantes.
- Preview muestra la campaña generada con acordeones (Estrategia, Audiencias, Anuncios, Presupuesto).
- Botones claros: "Guardar borrador" y "Revisar y editar".

**Problemas del AI Builder:**

| # | Problema | Severidad |
|---|---------|-----------|
| 1 | **No funciona en móvil.** Split `w-2/5` y `w-3/5` sin breakpoints responsivos | CRÍTICO |
| 2 | No se puede nombrar la campaña antes de guardar — usa nombre generado por IA | BAJO |
| 3 | El chat no persiste al navegar fuera. Si el usuario sale, pierde la conversación | MEDIO |
| 4 | Al fallar guardar/lanzar, solo hay `console.error` — sin feedback al usuario | ALTO |

**Editor de campaña (5 tabs):**
- Cada tab tiene un box explicativo para principiantes — excelente diseño educativo.
- Tab Ads: Preview live del anuncio con 3 formatos (Feed, Stories, Reels) — muy bueno.
- Tab Summary: Auditoría IA con score 0-100 y recomendaciones — feature diferenciador.
- Autosave con indicador visual ("Guardando..."/"Guardado").

**Problemas del editor:**

| # | Problema | Severidad |
|---|---------|-----------|
| 1 | Tabs mezclan idiomas: "Ad Sets" (EN) vs "Anuncios" (ES) | MEDIO |
| 2 | Contadores de caracteres (125/40/30) son informativos, no bloquean. Usuario puede exceder límites | BAJO |
| 3 | La auditoría IA corre automáticamente al abrir el tab Summary — gasta API calls innecesarias | MEDIO |
| 4 | Objetivos en Summary muestran valores raw de API ("OUTCOME_TRAFFIC") sin traducir | MEDIO |

---

### 1.2 Flujo del Usuario Avanzado (Trafficker)

**Herramientas avanzadas disponibles:**
- Trafficker IA (Analytics) con health gauge, diagnósticos, benchmarks, predicciones
- A/B Testing con evaluador automático
- Funnel Builder con generación IA
- Retargeting con detección de oportunidades
- Scaling con evaluación por campaña
- Automatización con reglas + sugerencias IA
- Reportes con análisis IA + PDF

**Evaluación:**

| Aspecto | Evaluación |
|---------|------------|
| Acceso rápido a herramientas avanzadas | El sidebar agrupa todo bajo "Campañas" — acceso en 1-2 clicks |
| Control del editor manual | 5 tabs completos con bid strategy, placements, formatos. Suficiente control |
| Analytics detalladas | Page muy feature-dense: health score, breakdowns por audiencia/placement/dispositivo, benchmarks, predicciones. Podría abrumar pero un usuario avanzado lo apreciará |
| Automatización | Reglas con condiciones y acciones, historial de ejecuciones. Bien implementado |
| Reportes | Config de fecha, secciones seleccionables, AI toggle, PDF. Completo |

**Problemas para usuario avanzado:**

| # | Problema | Severidad |
|---|---------|-----------|
| 1 | **No hay paginación ni filtros en la lista de campañas.** Un trafficker con 50+ campañas no puede buscar/filtrar | ALTO |
| 2 | No hay búsqueda por nombre de campaña | ALTO |
| 3 | No hay acciones bulk en la tabla (seleccionar múltiples, pausar/activar en masa) | MEDIO |
| 4 | Analytics page (Trafficker IA) es extremadamente densa. Sin tabs o secciones colapsables para organizar | MEDIO |

---

### 1.3 Navegación y Organización

**Estructura actual del sidebar:**
```
Dashboard
Campañas (expandible)
  ├── Todas
  ├── A/B Tests
  ├── Funnels
  ├── Retargeting
  └── Escalado
Trafficker IA
Configuración (expandible)
  ├── Conexión Meta
  ├── Perfil
  ├── Automatización
  └── Facturación
```

**Problemas:**

| # | Problema | Severidad |
|---|---------|-----------|
| 1 | **Mezcla de idiomas:** "Dashboard" (EN), "A/B Tests" (EN), "Funnels" (EN), "Trafficker IA" (mix) | MEDIO |
| 2 | "Conexión Meta" apunta a `/settings/meta-connection` — esa ruta **no tiene página dedicada** (dead link) | ALTO |
| 3 | "Trafficker IA" podría confundir. ¿Es Analytics? ¿Es un asistente? El nombre no es descriptivo | MEDIO |
| 4 | El sidebar **no tiene comportamiento responsivo para móvil** — no hay drawer/hamburger. En pantallas pequeñas ocupa 64-256px permanentemente | CRÍTICO |
| 5 | Para un principiante, 9 items de navegación + submenús pueden ser abrumadores desde el día 1 | BAJO |

---

### 1.4 Consistencia Visual

**Patrones consistentes (BIEN):**
- shadcn/ui con zinc theme usado uniformemente
- Botones: variantes consistent (default, secondary, outline, destructive, ghost)
- Cards con `rounded-lg border` uniformes
- Iconos de Lucide React en toda la app
- Badges para estados con colores semánticos
- Toasts con `sonner` para feedback
- Accordions para secciones colapsables

**Inconsistencias encontradas:**

| # | Problema | Detalle |
|---|---------|---------|
| 1 | **Faltan acentos en páginas nuevas** | Scaling, Funnel Builder, Retargeting escriben "campana" en vez de "campaña", "dia" en vez de "día", "automatico" en vez de "automático". Error sistemático en features post-Phase 5 |
| 2 | No hay Skeleton UI | Todas las páginas usan spinner `<Loader2>` genérico. Sin skeleton cards para carga progresiva |
| 3 | Perfil (`/settings/profile`) es excesivamente largo | 5 secciones densas sin tabla de contenidos ni anchor navigation. Cada sección tiene su propio botón de guardar |
| 4 | Empty states inconsistentes | Algunas páginas tienen CTAs claros, otras simplemente muestran texto vacío |

---

### 1.5 Mobile Experience

**VEREDICTO: La app NO es usable en móvil.**

| Componente | Estado Móvil | Severidad |
|-----------|-------------|-----------|
| Landing navbar | Sin menú hamburguesa. Links invisibles | CRÍTICO |
| Sidebar dashboard | Sin drawer. Ocupa espacio fijo siempre | CRÍTICO |
| AI Builder (nueva campaña) | Split `w-2/5`/`w-3/5` sin stack vertical | CRÍTICO |
| Tabla de campañas | Sin responsive (no card view ni scroll horizontal) | ALTO |
| Dashboard KPIs | `md:grid-cols-2 lg:grid-cols-4` — funciona | OK |
| Editor tabs | `grid-cols-1` en mobile — funciona | OK |
| Ad preview | 220x390px stories preview — funciona | OK |
| Analytics page | Muy densa pero scrollable | MEDIO |

---

## PARTE 2: AUDITORÍA TÉCNICA

---

### 2.1 Seguridad

#### 2.1.1 Vulnerabilidades CRÍTICAS

| # | Vulnerabilidad | Archivo | Detalle |
|---|---------------|---------|---------|
| 1 | **Rate limiting in-memory es inefectivo en Vercel** | `src/lib/rate-limit.ts` | Usa `Map` en memoria. En serverless, cada cold start resetea el Map. **Todos los rate limits están esencialmente deshabilitados en producción.** |
| 2 | **No existe `middleware.ts`** | Raíz del proyecto | No hay capa centralizada de autenticación. Cada ruta implementa su propio auth check. Si un desarrollador olvida agregar auth a una nueva ruta, queda pública. |
| 3 | **Uso excesivo de admin client** | 15+ API routes | `createAdminClient()` (service role, bypassa RLS) usado en rutas de lectura donde el client con RLS sería suficiente. Un solo filtro `.eq('user_id')` faltante expone datos de todos los usuarios. |
| 4 | **Data deletion endpoint sin verificación si falta META_APP_SECRET** | `src/app/api/auth/meta/data-deletion/route.ts:31` | Si `META_APP_SECRET` no está configurado, la verificación de firma se salta por completo. Un atacante podría borrar datos de cualquier usuario de Meta. |

#### 2.1.2 Vulnerabilidades MEDIAS

| # | Vulnerabilidad | Archivo | Detalle |
|---|---------------|---------|---------|
| 5 | **Zod schemas definidos pero NO usados** | `src/lib/validators.ts` | 11 schemas definidos. Solo 1 ruta (`ai/generate-image`) usa `safeParse`. Las demás usan `request.json() as T` sin validación. |
| 6 | **`sanitizeString()` nunca se llama** | `src/lib/validators.ts` | Función de sanitización definida y exportada pero importada en 0 archivos. |
| 7 | **`unsafe-eval` en CSP** | `next.config.ts` | `script-src` incluye `'unsafe-eval'` — permite ejecución de JS arbitrario si se encuentra un vector XSS. |
| 8 | **19+ API routes sin rate limiting** | Ver tabla abajo | Incluye operaciones costosas como PDF generation, AI analysis, Meta API proxies. |
| 9 | **CRON_SECRET podría matchear `Bearer undefined`** | Todas las rutas cron | Si env var no está seteada, `Bearer ${undefined}` = `Bearer undefined`. Un atacante podría ejecutar crons enviando ese header. |
| 10 | **Stripe checkout usa header `Origin` para redirect** | `src/app/api/stripe/create-checkout/route.ts` | El header `Origin` puede ser spoofed. Debería validar contra allowlist o usar `NEXT_PUBLIC_APP_URL`. |
| 11 | **Encriptación débil** | `src/lib/encryption.ts` | CryptoJS usa EVP_BytesToKey (MD5-based) internamente. Sin HMAC/GCM para integridad. Debería usar `crypto` nativo de Node.js con AES-256-GCM. |

#### 2.1.3 Rutas API sin Rate Limiting

| Ruta | Riesgo |
|------|--------|
| `POST /api/campaigns/status` | MEDIO — toggle rápido |
| `POST /api/ai/analyze-campaign` | ALTO — llamada IA costosa |
| `GET /api/reports/campaign/[id]/pdf` | ALTO — generación PDF + IA |
| `GET/POST /api/automation-rules` | MEDIO |
| `GET /api/meta/ad-accounts, pages, pixels` | MEDIO — Meta API proxy |
| `POST /api/stripe/portal` | MEDIO |
| `GET /api/analytics/dashboard` | BAJO |
| `GET /api/notifications` | BAJO (pero polled cada 60s) |

#### 2.1.4 RLS y Base de Datos

- **Migraciones 001-002:** RLS habilitado en todas las tablas con policies correctas por `auth.uid()`.
- **Migraciones 003+:** Patrón consistente pero muchas rutas usan `createAdminClient()` que bypassa RLS completamente.
- **Riesgo:** La defensa en profundidad se pierde al usar admin client para operaciones de lectura normales.

#### 2.1.5 Tokens de Meta

- Encriptados con AES-256 antes de almacenar — BIEN.
- Sin default key fallback, throw si `ENCRYPTION_KEY` falta — BIEN.
- Token pasado como URL query param a Meta API (estándar de Meta pero visible en logs).

---

### 2.2 Rendimiento

#### 2.2.1 N+1 Queries (CRÍTICO)

**`src/app/api/cron/sync-metrics/route.ts` — El peor ofensor:**
```
Para cada conexión de Meta:
  → 1 query para obtener campañas
  Para cada campaña:
    → 1 Meta API call: getCampaignStatus()
    → 1 DB write: update status
    → 5 Meta API calls: insights (base + 4 breakdowns)
    → N DB writes: upsert por día de métricas
  Para cada campaña (SEGUNDO loop):
    → 1 query: campaign_ads
    → 1 query: campaign name
    → 1 query: campaign_metrics
    Para cada ad fatigued:
      → 1 query: creative_rotations
```

**Impacto:** Para 10 usuarios con 10 campañas cada uno = **500+ llamadas secuenciales a Meta API** + cientos de queries a DB. En un solo cron invocation.

**`src/app/api/analytics/trafficker-analysis/route.ts`:**
- Fetch de métricas por campaña en loop (líneas 70-76).

#### 2.2.2 Bundle Size

| Dependencia | Tamaño Estimado | Uso | Mitigación |
|------------|----------------|-----|------------|
| `@react-pdf/renderer` | ~1.5MB+ | 4 archivos (PDF generation) | NO lazy loaded en imports |
| `recharts` | ~400KB | 6 componentes | Parcialmente lazy (dashboard sí, detail tabs NO) |
| `@google/generative-ai` + `@google/genai` | ~200KB combinados | 2 SDKs de Google AI duplicados | Solo `@google/genai` se usa para 1 función (`generateAdImage`) |
| `crypto-js` | ~100KB | Solo AES encrypt/decrypt | Reemplazable por `crypto` nativo (0 bundle impact) |

#### 2.2.3 Lazy Loading Faltante

**Componentes con recharts SIN lazy loading:**
- `src/components/campaigns/detail/tab-audience.tsx`
- `src/components/campaigns/detail/tab-devices.tsx`
- `src/components/campaigns/detail/tab-overview.tsx`
- `src/components/campaigns/detail/tab-placements.tsx`
- `src/components/dashboard/kpi-card.tsx`

**Todos los componentes de `@react-pdf/renderer` sin lazy loading** (aunque el PDF route es server-side, los imports están en el dependency graph).

#### 2.2.4 Caching

**Rutas CON caching (BIEN):**
- `/api/analytics/dashboard` — `max-age=60`
- `/api/analytics/campaign/[id]` — `max-age=60`
- `/api/subscription` — `max-age=300`
- `/api/creative-fatigue` — `max-age=300`

**Caching FALTANTE:**
- `checkPlanLimit()` — hace 1-2 DB queries en cada invocación, llamado en casi toda ruta API. El plan del usuario raramente cambia. **Candidato ideal para cache.**
- `getMetaClientForUser()` — descifra el token en cada llamada.
- No se usa `unstable_cache` de Next.js en ningún lugar.
- No se usa `revalidate` en ninguna ruta.

#### 2.2.5 Todas las Páginas son Client Components

**25 de 25 `page.tsx` tienen `'use client'`.** Esto significa:
- Sin SSR para ninguna página
- Sin server components
- Todo el data fetching es client-side via `useEffect` + `fetch`
- Cargas iniciales envían shells vacíos con spinners
- SEO impact para páginas públicas (`/pricing`, `/privacy`, `/terms`, `/guia`)

**Páginas que deberían ser server components:**
- `/pricing/page.tsx` — contenido estático
- `/privacy/page.tsx` — texto legal estático
- `/terms/page.tsx` — texto legal estático
- `/guia/page.tsx` — contenido de guía

#### 2.2.6 Race Condition en Usage Tracking

`src/lib/usage.ts` tiene un **check-then-act race condition:**
```typescript
// Lee el valor actual
const { data } = await supabase.from('usage_tracking').select('*')...
// Si existe, incrementa
await supabase.from('usage_tracking').update({ [field]: currentVal + 1 })...
```
Dos requests concurrentes pueden leer el mismo valor y uno pierde su incremento. Debería usar SQL `UPDATE SET field = field + 1` atómico o un RPC de Supabase.

#### 2.2.7 Memoización

- `useCallback` usado en 12+ archivos — bien.
- **0 usos de `useMemo`** en todo el proyecto.
- **0 usos de `React.memo`** en todo el proyecto.
- Componentes de listas (campañas, tests, rules) re-renderizan completamente sin memoización.

---

### 2.3 Error Handling

#### 2.3.1 API Routes SIN try/catch (se crashean en errores)

| Ruta | Consecuencia |
|------|-------------|
| `GET /api/analytics/dashboard` | Si cualquier query falla, la ruta crashea con 500 genérico |
| `GET /api/analytics/campaign/[id]` | Si `getCampaignAnalytics()` lanza, la ruta crashea |
| `GET /api/auth/confirm` | Crash si la verificación falla |
| `GET /api/auth/meta/connect` | Crash si la URL de auth falla |
| `POST /api/auth/meta/disconnect` | Crash si la desconexión falla |

#### 2.3.2 Errores Silenciosos (catch vacíos)

**Sin feedback al usuario — problemas graves:**

| # | Ubicación | Qué falla silenciosamente |
|---|----------|--------------------------|
| 1 | `dashboard/page.tsx:42` | Fetch de datos del dashboard — usuario ve estado vacío sin explicación |
| 2 | `dashboard/page.tsx:116` | Toggle de estado de campaña — `// ignore` |
| 3 | `campaigns/[id]/page.tsx:74` | Toggle de estado de campaña — `// ignore` |
| 4 | `campaigns/[id]/page.tsx:103` | Toggle de estado de ad set — `// ignore` |
| 5 | `analytics/page.tsx:385,451,467,482` | Múltiples fetches — `// silently fail` |
| 6 | `campaigns/new/page.tsx:39-40` | Guardar borrador — solo `console.error`, sin toast |
| 7 | `campaigns/new/page.tsx:67-68` | Lanzar campaña — solo `console.error`, sin toast |
| 8 | `onboarding/page.tsx:233` | Completar onboarding — solo `console.error` |
| 9 | `campaigns/funnel-builder/page.tsx:71` | Fetch inicial — silencioso |
| 10 | `hooks/useNotifications.ts:18` | Polling de notificaciones — silencioso |

#### 2.3.3 Eliminación sin Confirmación

| Ubicación | Problema |
|----------|---------|
| `campaigns/page.tsx` | `handleDelete` borra directamente sin diálogo. Sin verificar si la campaña está activa en Meta. Sin error handling — si falla, la campaña desaparece de la UI pero persiste en DB. |
| `automation-rules/page.tsx` | Eliminación de reglas sin confirmación |
| `bulk-create/page.tsx` | "Limpiar todo" sin confirmación |

#### 2.3.4 Rollback Incompleto

`src/lib/meta/publisher.ts` y `src/lib/funnels/publisher.ts`:
- Rollback borra en orden inverso (ads → creatives → adsets → campaigns).
- **Cada operación de rollback tiene `catch { /* ignore */ }`** — si falla un delete, el objeto queda huérfano en Meta sin registro ni notificación.
- Sin retry logic para operaciones de rollback.
- Sin logging de qué operaciones de rollback fallaron.

**Edge case:** Si el servidor se cae durante publishing, la campaña queda en status `'publishing'` permanentemente sin mecanismo de recuperación.

#### 2.3.5 Error Messages

- Mensajes de error en español en la mayoría de rutas — BIEN.
- **`getMetaClientForUser()` retorna `'No active Meta connection found'` en inglés** — rompe el patrón de UI en español.
- Muchas rutas exponen `error.message` directamente al cliente, potencialmente filtrando detalles internos (errores de DB, Meta API errors, stack traces).
- Error boundary expone stack traces en producción via botón "Ver detalles".

#### 2.3.6 Loading y Empty States

- **No existen archivos `loading.tsx`** en ninguna ruta. Sin Suspense boundaries automáticos.
- **No hay Skeleton UI** — todo usa spinner `<Loader2>`.
- Empty states generalmente bien implementados con CTAs accionables.
- Billing page retorna `null` si falla el fetch — debería mostrar error state.

---

### 2.4 Código

#### 2.4.1 Duplicación de Código

**Patrón de auth duplicado en 50+ rutas:**
```typescript
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
```
→ Debería ser un middleware o utility `requireAuth(request)`.

**Publisher duplicado:**
- `CampaignPublisher` y `FunnelPublisher` comparten ~100 líneas de lógica idéntica:
  - `getPromotedObject()`
  - Rollback logic
  - Ad creative spec building
  - Validación

**Decrypt + Meta Client en crons:**
- Crons (sync-metrics, ab-test-evaluator, refresh-tokens) manualmente desencriptan tokens en vez de usar `getMetaClientForUser()`.

#### 2.4.2 TypeScript

**16 instancias de `any`:**
- `src/lib/stripe.ts` — necesario para el Proxy pattern
- `src/lib/usage.ts` — Supabase return types sin tipar
- `src/app/api/ab-tests/` — 6 instancias. JSONB columns (`variants`) sin tipo propio
- `src/app/api/reports/*/pdf/route.ts` — React.createElement workaround
- `src/components/ab-testing/ab-test-card.tsx` — `(v: any)`
- `src/app/(dashboard)/campaigns/funnel-builder/page.tsx` — `newData: any`

**20 comentarios `eslint-disable`** suprimiendo `@typescript-eslint/no-explicit-any` y `react-hooks/exhaustive-deps`.

#### 2.4.3 Console Logs

- **1 `console.log` en producción:** `src/lib/meta/publisher.ts:172` — debug log que debería removerse.
- **~140 `console.error`** en catch blocks — deberían migrarse al logger estructurado (`src/lib/logger.ts`).
- El logger existe y funciona pero solo se usa en 4-5 archivos.

#### 2.4.4 Dead Code

- `src/lib/validators.ts` — 11 Zod schemas + `sanitizeString()` exportados pero nunca importados.
- `src/lib/api-errors.ts` — `handleApiError()` solo usado en 1 ruta (`audit-campaign`).

---

## PARTE 3: PROPUESTA DE MEJORAS

---

### 3.1 "Campaña Express" — Diseño Propuesto

#### Concepto
Un flujo de 1-click que genera una campaña completa basada en todo el contexto del negocio.

#### Dónde debería vivir
**Dashboard** — como el CTA principal cuando el usuario tiene Meta conectado. También accesible desde la página de campañas.

#### Flujo propuesto

```
┌─────────────────────────────────────────────────────┐
│  DASHBOARD                                          │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  ⚡ Campaña Express                           │  │
│  │                                               │  │
│  │  "Describe tu objetivo en una frase"          │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │ Quiero más ventas para mi curso online  │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                               │  │
│  │  [🚀 Generar Campaña Express]                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  O también:                                         │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Quick Cards: │  │              │                │
│  │ "Más ventas" │  │ "Más leads"  │                │
│  │ "Más tráfico"│  │ "Más alcance"│                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  GENERANDO... (loading con steps animados)          │
│                                                     │
│  ✅ Analizando tu negocio...                        │
│  ✅ Consultando buyer personas...                   │
│  ✅ Analizando campañas anteriores...               │
│  ⏳ Generando estrategia...                         │
│  ○  Creando audiencias...                           │
│  ○  Escribiendo copy...                             │
│  ○  Definiendo presupuesto...                       │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│  RESUMEN EJECUTIVO                                  │
│                                                     │
│  📊 Score de confianza: 87/100                      │
│                                                     │
│  Estrategia: Conversiones vía tráfico web           │
│  Audiencia: Profesionales 25-45, interesados en...  │
│  Presupuesto: $15/día (~$450/mes)                   │
│  Copy: "Transforma tu carrera con..."               │
│  Imagen: [Preview generada por IA]                  │
│  Resultado estimado: 150-300 clicks/día             │
│                                                     │
│  Basado en:                                         │
│  • Buyer persona "María Emprendedora"               │
│  • Ángulo de venta "Transformación profesional"     │
│  • Mejor CPA histórico: campaña "Curso Premium"     │
│  • Benchmarks 2026 del sector educación             │
│                                                     │
│  ┌────────────────┐  ┌──────────────────────────┐  │
│  │ 🚀 Publicar    │  │ ✏️ Ajustar en Editor     │  │
│  └────────────────┘  └──────────────────────────┘  │
│                                                     │
│  [Regenerar con cambios]                            │
└─────────────────────────────────────────────────────┘
```

#### Datos que debería usar la IA
1. `business_profiles` — industria, descripción, ubicación, website
2. `buyer_personas` + `sales_angles` — del perfil del usuario
3. `brand_identity` — colores, tono, tipografía
4. `campaigns` históricas — qué funcionó mejor (mejores CTR, CPA, ROAS)
5. `campaign_metrics` — datos reales de rendimiento
6. Benchmarks de la industria del usuario
7. Best practices Meta Ads 2026

#### Implementación técnica sugerida
- Nueva API route: `POST /api/ai/campaign-express`
- Prompt compuesto que incluye todo el contexto
- Generación de imagen con Gemini 2.5 Flash Image
- Un solo JSON response con toda la campaña
- Guardar como draft para revisión o publicar directo

---

### 3.2 Reorganización del Sidebar

#### Estructura Actual vs Propuesta

```
ACTUAL                          PROPUESTA
──────                          ─────────
Dashboard                       Inicio
Campañas ▼
  Todas                         Campañas ▼
  A/B Tests                       Todas las campañas
  Funnels                         Crear con IA
  Retargeting                     Creación masiva
  Escalado
Trafficker IA                   Optimización ▼
Configuración ▼                   Análisis IA
  Conexión Meta                   Pruebas A/B      [PRO]
  Perfil                          Embudos          [PRO]
  Automatización                  Retargeting      [PRO]
  Facturación                     Escalado         [PRO]
                                  Automatización   [PRO]

                                Configuración ▼
                                  Mi negocio
                                  Conexión Meta
                                  Facturación
```

#### Cambios clave:
1. **Renombrar todo a español:** "Inicio", "Pruebas A/B", "Embudos", "Análisis IA"
2. **Fusionar "Trafficker IA" + features avanzadas** bajo "Optimización" — agrupa las herramientas de análisis y mejora
3. **Mover "Crear con IA" al submenú de Campañas** — acceso más directo
4. **Mover "Automatización" a Optimización** — es una herramienta de optimización, no configuración
5. **Simplificar Configuración** — solo settings reales del negocio
6. **Badges [PRO]** en features de pago — visual claro de qué es premium
7. **Eliminar "Conexión Meta" como página separada** — integrarlo en "Mi negocio" o mostrarlo como banner cuando no esté conectado
8. **"Perfil" → "Mi negocio"** — más descriptivo

---

### 3.3 Quick Wins de UX

#### Alta Prioridad

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 1 | **Agregar diálogos de confirmación** para delete de campañas, reglas, y "limpiar todo" | Alto — previene pérdida de datos | Bajo |
| 2 | **Agregar toast feedback** a todos los catch blocks que actualmente son silenciosos (10+ ubicaciones) | Alto — usuario entiende qué pasa | Bajo |
| 3 | **Agregar menú hamburguesa** en landing page y drawer en dashboard para móvil | Alto — hace la app usable en móvil | Medio |
| 4 | **Corregir acentos** en Scaling, Funnels, Retargeting pages | Medio — profesionalismo | Bajo |
| 5 | **Traducir labels del sidebar** (Dashboard→Inicio, A/B Tests→Pruebas A/B, Funnels→Embudos) | Medio — consistencia | Bajo |
| 6 | **Agregar paginación + búsqueda** a la tabla de campañas | Alto para power users | Medio |
| 7 | **Agregar `loading.tsx`** en las rutas principales del dashboard | Medio — mejor perceived performance | Bajo |

#### Media Prioridad

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 8 | Onboarding tour post-setup (tooltips guiados en dashboard) | Alto para nuevos usuarios | Medio |
| 9 | Anchor navigation en la página de perfil (tabla de contenidos lateral) | Medio | Bajo |
| 10 | Skeleton UI en vez de spinners para KPIs y tablas | Medio — perceived performance | Medio |
| 11 | Character limit enforcement (no solo informativo) en editor de ads | Bajo | Bajo |
| 12 | AI audit en Summary tab: botón manual en vez de auto-run | Medio — ahorra API calls | Bajo |
| 13 | Hacer el AI Builder responsive: stack vertical en móvil (chat arriba, preview abajo) | Alto para mobile | Medio |
| 14 | Persistir chat de IA en `ai_conversations` al navegar fuera | Medio | Medio |

#### Baja Prioridad

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 15 | Agregar "Learn More" links a recursos externos en los explainer boxes del editor | Bajo | Bajo |
| 16 | Reemplazar testimonios genéricos con reales o removerlos | Bajo | Bajo |
| 17 | Agregar toggle anual/mensual en pricing de la landing (como en `/pricing`) | Bajo | Bajo |
| 18 | Empty state en billing cuando falla el fetch (actualmente retorna `null`) | Bajo | Bajo |

---

### 3.4 Mejoras Técnicas Prioritarias (ordenadas por impacto)

#### Tier 1 — Crítico (arreglar antes de producción)

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 1 | **Implementar rate limiting distribuido** (Upstash Redis o Vercel KV). El rate limiter in-memory es inefectivo en serverless. | Seguridad | Medio |
| 2 | **Crear `middleware.ts`** para auth centralizado, refresh de sesión, y protección de rutas. Eliminar auth boilerplate duplicado de 50+ rutas. | Seguridad + DX | Medio |
| 3 | **Usar Zod schemas definidos** en todas las API routes. Reemplazar `request.json() as T` con `schema.parse()`. Ya están escritos, solo falta conectarlos. | Seguridad | Bajo |
| 4 | **Arreglar verificación de data-deletion.** Siempre rechazar si `META_APP_SECRET` no está seteado. | Seguridad | Bajo |
| 5 | **Validar CRON_SECRET exists** antes de comparar: `if (!process.env.CRON_SECRET \|\| authHeader !== ...)` | Seguridad | Bajo |
| 6 | **Agregar try/catch** a las 5 API routes que no lo tienen | Estabilidad | Bajo |
| 7 | **Arreglar race condition en `incrementUsage()`** — usar SQL `UPDATE SET field = field + 1` atómico | Integridad de datos | Bajo |

#### Tier 2 — Alto Impacto

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 8 | **Paralelizar N+1 queries en sync-metrics** — `Promise.all()` para calls a Meta API + batch DB operations | Rendimiento cron | Medio |
| 9 | **Reducir uso de admin client** — usar client con RLS donde sea posible como defense-in-depth | Seguridad | Medio |
| 10 | **Convertir páginas estáticas a server components** (`/pricing`, `/privacy`, `/terms`, `/guia`) | SEO + Performance | Bajo |
| 11 | **Lazy load recharts en campaign detail tabs** | Bundle size | Bajo |
| 12 | **Cache `checkPlanLimit()` result** por request o con TTL corto | Performance (reduce DB queries) | Bajo |
| 13 | **Migrar `console.error` al logger estructurado** | Observabilidad | Medio |
| 14 | **Extraer `requireAuth()` utility** del patrón duplicado en 50+ rutas | DX + Mantenibilidad | Bajo |

#### Tier 3 — Mejoras de Calidad

| # | Mejora | Impacto | Esfuerzo |
|---|--------|---------|----------|
| 15 | Consolidar 2 Google AI SDKs en 1 (`@google/genai` puede hacer ambas cosas) | Bundle size | Medio |
| 16 | Reemplazar `crypto-js` con `crypto` nativo de Node.js (AES-256-GCM) | Seguridad + Bundle | Medio |
| 17 | Tipar JSONB columns de AB testing (eliminar `any` types) | Type safety | Bajo |
| 18 | Extraer publisher base class (shared entre Campaign y Funnel publisher) | Mantenibilidad | Medio |
| 19 | Remover `'unsafe-eval'` de CSP en producción | Seguridad | Bajo |
| 20 | Split `src/lib/gemini/prompts.ts` (1,439 líneas) en archivos individuales | Tree-shaking | Bajo |
| 21 | Usar `handleApiError()` consistentemente en todas las rutas (ya existe, no se usa) | Error handling | Medio |
| 22 | Remover `console.log` de `publisher.ts:172` | Limpieza | Trivial |

---

## RESUMEN EJECUTIVO

### Lo que está BIEN hecho:
- Arquitectura sólida con separación clara de responsabilidades
- AI integration es el diferenciador clave — está bien implementada
- Español consistente en la mayoría del UI
- Explainer boxes en el editor son excelentes para onboarding
- Plan gating con upgrade modal es profesional y no agresivo
- Autosave en editor funciona correctamente
- Ad preview mock es muy fiel a la realidad de Meta
- RLS configurado en tablas core
- Encriptación de tokens implementada (aunque mejorable)

### Lo que necesita atención URGENTE:
1. **Mobile no funciona** — sidebar, landing navbar, AI builder son inutilizables en móvil
2. **Rate limiting es decorativo** — in-memory no funciona en Vercel serverless
3. **No hay middleware** — cada ruta maneja auth independientemente
4. **Zod schemas escritos pero sin usar** — seguridad de inputs es ilusoria
5. **Errores silenciosos en toda la app** — 10+ catch blocks vacíos en flujos críticos
6. **N+1 queries en cron** — puede timeout con muchos usuarios

### Riesgo de producción:
**MEDIO-ALTO.** La app funciona correctamente en happy path pero:
- La seguridad tiene gaps significativos (rate limiting, input validation, admin client overuse)
- Los errores se tragan silenciosamente en flujos críticos
- Mobile es inutilizable
- El cron de sincronización no escala

**Recomendación:** Arreglar Tier 1 de mejoras técnicas + mobile responsiveness antes de launch público.

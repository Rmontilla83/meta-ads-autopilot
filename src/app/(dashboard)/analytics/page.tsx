'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Users,
  Layout,
  Image,
  Search,
  Loader2,
  Zap,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  BarChart3,
  ClipboardList,
  ArrowRight,
  CircleDollarSign,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TraffickerAnalysis {
  health_score: number;
  overall_assessment: string;
  campaign_diagnostics: Array<{
    campaign_id: string;
    campaign_name: string;
    score: number;
    metrics_status: {
      ctr: 'good' | 'warning' | 'critical';
      cpc: 'good' | 'warning' | 'critical';
      cpa: 'good' | 'warning' | 'critical';
      frequency: 'good' | 'warning' | 'critical';
      roas: 'good' | 'warning' | 'critical';
    };
    trend: 'improving' | 'stable' | 'declining';
  }>;
  recommendations: Array<{
    priority: 'urgent' | 'important' | 'optimization';
    title: string;
    explanation: string;
    action_type: string;
    action_params: Record<string, unknown>;
    target_id: string;
    target_name: string;
    estimated_impact: string;
  }>;
  audience_insights: {
    best_segment: string;
    best_placement: string;
    best_schedule: string;
    creative_winner: string;
  };
  prediction_30d: {
    current_trajectory: { leads: number; spend: number; cpa: number };
    optimized_trajectory: { leads: number; spend: number; cpa: number };
  };
  industry_comparison: {
    ctr: { yours: number; industry_avg: number; top_performers: number };
    cpc: { yours: number; industry_avg: number; top_performers: number };
    cpa: { yours: number; industry_avg: number; top_performers: number };
  };
}

interface ActionHistoryEntry {
  id: string;
  recommendation_title: string;
  action_type: string;
  result: string;
  applied_at: string;
  target_name: string | null;
}

interface AnalysisHistoryEntry {
  id: string;
  health_score: number;
  overall_assessment: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIRECT_ACTIONS = new Set([
  'pause_ad',
  'increase_budget',
  'decrease_budget',
  'rotate_creative',
  'create_ab_test',
  'create_retargeting',
  'scale_winner',
  'create_funnel',
  'create_lookalike',
  'apply_schedule',
  'test_hooks',
]);

const ACTION_LABELS: Record<string, string> = {
  pause_ad: 'Pausar anuncio',
  increase_budget: 'Aumentar presupuesto',
  decrease_budget: 'Reducir presupuesto',
  rotate_creative: 'Rotar creativo',
  adjust_targeting: 'Ajustar segmentación',
  change_placement: 'Cambiar placement',
  duplicate_winner: 'Duplicar ganador',
  create_variation: 'Crear variación',
  adjust_schedule: 'Ajustar horario',
  create_ab_test: 'Crear A/B Test',
  create_retargeting: 'Crear retargeting',
  scale_winner: 'Escalar ganador',
  create_funnel: 'Crear funnel',
  create_lookalike: 'Crear lookalike',
  apply_schedule: 'Aplicar horario',
  test_hooks: 'Probar hooks',
};

const STATUS_COLOR: Record<string, string> = {
  good: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  good: 'Bueno',
  warning: 'Atención',
  critical: 'Crítico',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function healthColor(score: number): string {
  if (score >= 71) return '#22c55e';
  if (score >= 41) return '#eab308';
  return '#ef4444';
}

function healthLabel(score: number): string {
  if (score >= 71) return 'Excelente';
  if (score >= 41) return 'Necesita atención';
  return 'Estado crítico';
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('es-MX');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pctChange(current: number, optimized: number): string {
  if (current === 0) return '+0%';
  const diff = ((optimized - current) / current) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HealthGauge({ score }: { score: number }) {
  const color = healthColor(score);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/30"
          />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>
      <span
        className="text-sm font-medium px-3 py-1 rounded-full"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {healthLabel(score)}
      </span>
    </div>
  );
}

function MetricDot({ status }: { status: 'good' | 'warning' | 'critical' }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_COLOR[status]}`} />
  );
}

function TrendIcon({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function PriorityBadge({ priority }: { priority: 'urgent' | 'important' | 'optimization' }) {
  const variants: Record<string, { className: string; label: string }> = {
    urgent: { className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Urgente' },
    important: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Importante' },
    optimization: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Optimización' },
  };
  const v = variants[priority];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v.className}`}>
      {v.label}
    </span>
  );
}

function BenchmarkBar({
  label,
  yours,
  industryAvg,
  topPerformers,
  lowerIsBetter,
}: {
  label: string;
  yours: number;
  industryAvg: number;
  topPerformers: number;
  lowerIsBetter: boolean;
}) {
  const maxVal = Math.max(yours, industryAvg, topPerformers) * 1.2 || 1;
  const yoursPct = (yours / maxVal) * 100;
  const avgPct = (industryAvg / maxVal) * 100;
  const topPct = (topPerformers / maxVal) * 100;

  const isGood = lowerIsBetter ? yours <= industryAvg : yours >= industryAvg;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm font-bold ${isGood ? 'text-emerald-500' : 'text-red-500'}`}>
          {lowerIsBetter
            ? formatCurrency(yours)
            : `${yours.toFixed(2)}%`}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-14 shrink-0">Tuyo</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isGood ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${yoursPct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-14 shrink-0">Promedio</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${avgPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {lowerIsBetter ? formatCurrency(industryAvg) : `${industryAvg.toFixed(2)}%`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-14 shrink-0">Top</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-700"
              style={{ width: `${topPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {lowerIsBetter ? formatCurrency(topPerformers) : `${topPerformers.toFixed(2)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

// Navigation-based actions that redirect instead of calling apply-recommendation
const NAVIGATION_ACTIONS: Record<string, (targetId: string) => string> = {
  create_ab_test: (id) => `/campaigns/${id}/ab-test`,
  create_retargeting: () => `/campaigns/retargeting`,
  scale_winner: () => `/scaling`,
  create_funnel: () => `/campaigns/funnel-builder`,
  create_lookalike: () => `/campaigns/retargeting`,
  apply_schedule: (id) => `/campaigns/${id}/scheduling`,
  test_hooks: (id) => `/campaigns/${id}/ab-test`,
};

function FeatureStatusSection() {
  const [stats, setStats] = useState<{
    abTests: number;
    funnels: number;
    fatiguedAds: number;
    scalingThisWeek: number;
    schedulesApplied: number;
    lookalikes: number;
  } | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [abRes, funnelRes, fatigueRes, scalingRes, schedRes, audRes] = await Promise.allSettled([
          fetch('/api/ab-tests').then(r => r.ok ? r.json() : { tests: [] }),
          fetch('/api/funnels').then(r => r.ok ? r.json() : { funnels: [] }),
          fetch('/api/creative-fatigue').then(r => r.ok ? r.json() : { results: [] }),
          fetch('/api/scaling/history').then(r => r.ok ? r.json() : { events: [] }),
          fetch('/api/scheduling/analyze', { method: 'POST', body: '{}' }).then(() => ({ applied: 0 })).catch(() => ({ applied: 0 })),
          fetch('/api/retargeting/audiences').then(r => r.ok ? r.json() : { audiences: [] }),
        ]);

        const abTests = abRes.status === 'fulfilled' ? (abRes.value?.tests?.filter((t: { status: string }) => t.status === 'running')?.length ?? 0) : 0;
        const funnels = funnelRes.status === 'fulfilled' ? (funnelRes.value?.funnels?.filter((f: { status: string }) => f.status === 'active')?.length ?? 0) : 0;
        const fatiguedAds = fatigueRes.status === 'fulfilled' ? (fatigueRes.value?.results?.filter((r: { status: string }) => r.status === 'fatigued')?.length ?? 0) : 0;
        const scalingThisWeek = scalingRes.status === 'fulfilled' ? (scalingRes.value?.events?.length ?? 0) : 0;
        const lookalikes = audRes.status === 'fulfilled' ? (audRes.value?.audiences?.filter((a: { audience_type: string }) => a.audience_type === 'lookalike')?.length ?? 0) : 0;

        setStats({ abTests, funnels, fatiguedAds, scalingThisWeek, schedulesApplied: 0, lookalikes });
      } catch {
        toast.error('Error al cargar las estadísticas de features');
      }
    }
    fetchStats();
  }, []);

  if (!stats) return null;

  const items = [
    { label: 'A/B Tests activos', value: stats.abTests, color: 'text-blue-500' },
    { label: 'Funnels activos', value: stats.funnels, color: 'text-violet-500' },
    { label: 'Ads fatigados', value: stats.fatiguedAds, color: stats.fatiguedAds > 0 ? 'text-red-500' : 'text-emerald-500' },
    { label: 'Escalados recientes', value: stats.scalingThisWeek, color: 'text-amber-500' },
    { label: 'Lookalikes creados', value: stats.lookalikes, color: 'text-indigo-500' },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-bold">Estado de Features</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {items.map((item) => (
          <Card key={item.label} className="text-center p-4">
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<TraffickerAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLast, setLoadingLast] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('last_14_days');
  const [applyingAction, setApplyingAction] = useState<string | null>(null);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedRecs, setExpandedRecs] = useState<Set<number>>(new Set());
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const loadedRef = useRef(false);

  // ------ Fetch action history ------
  const fetchActionHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/apply-recommendation');
      if (res.ok) {
        const data = await res.json();
        setActionHistory(data.actions || data.history || []);
        const titleSet = new Set<string>(
          (data.actions || data.history || [])
            .filter((h: ActionHistoryEntry) => h.result === 'success')
            .map((h: ActionHistoryEntry) => h.recommendation_title)
        );
        setAppliedActions(titleSet);
      }
    } catch {
      toast.error('Error al cargar el historial de acciones');
    }
  }, []);

  // ------ Load last saved analysis on mount ------
  const loadLastAnalysis = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/trafficker-analysis');
      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setAnalysis(data.analysis);
          setAnalysisTimestamp(data.created_at);
        }
      }
    } catch {
      toast.error('Error al cargar el último análisis');
    } finally {
      setLoadingLast(false);
    }
  }, []);

  // ------ Fetch analysis history ------
  const fetchAnalysisHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/trafiquer-history?limit=10');
      if (res.ok) {
        const data = await res.json();
        setAnalysisHistory(data.analyses || []);
      }
    } catch {
      toast.error('Error al cargar el historial de análisis');
    }
  }, []);

  // ------ Generate new analysis ------
  const fetchAnalysis = useCallback(async (range: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/trafficker-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_range: range }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${res.status}: No se pudo obtener el análisis`);
      }

      const data = await res.json();
      setAnalysis(data.analysis || data);
      setAnalysisTimestamp(data.created_at || new Date().toISOString());
      // Refresh history after new analysis
      fetchAnalysisHistory();
      toast.success('Análisis completado y guardado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido al analizar';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [fetchAnalysisHistory]);

  // ------ Apply recommendation ------
  const handleApplyRecommendation = async (rec: TraffickerAnalysis['recommendations'][number]) => {
    // Navigation-based actions redirect to the feature page
    const navFn = NAVIGATION_ACTIONS[rec.action_type];
    if (navFn) {
      const campaignId = rec.target_id || rec.action_params?.campaign_id as string || '';
      router.push(navFn(campaignId));
      return;
    }

    setApplyingAction(rec.target_id);
    try {
      const res = await fetch('/api/analytics/apply-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: rec.action_type,
          action_params: rec.action_params,
          target_id: rec.target_id,
          target_name: rec.target_name,
          recommendation_title: rec.title,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al aplicar la recomendación');
      }

      const data = await res.json();
      setAppliedActions(prev => new Set(prev).add(rec.title));
      setActionHistory(prev => [
        {
          id: data.id || rec.target_id,
          recommendation_title: rec.title,
          action_type: rec.action_type,
          result: data.result || 'success',
          applied_at: new Date().toISOString(),
          target_name: rec.target_name,
        },
        ...prev,
      ]);
      toast.success(`Recomendación aplicada: ${rec.title}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(message);
    } finally {
      setApplyingAction(null);
    }
  };

  // ------ Toggle expansions ------
  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRec = (index: number) => {
    setExpandedRecs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // ------ Load data on mount ------
  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadLastAnalysis();
      fetchActionHistory();
      fetchAnalysisHistory();
    }
  }, [loadLastAnalysis, fetchActionHistory, fetchAnalysisHistory]);

  // =====================================================================
  // LOADING LAST ANALYSIS STATE
  // =====================================================================
  if (loadingLast) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analíticas</h1>
          <p className="text-muted-foreground mt-1">
            Tu asistente de tráfico digital con IA.
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-muted-foreground">Cargando último análisis...</span>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================================
  // EMPTY STATE (no saved analysis)
  // =====================================================================
  if (!analysis && !loading && !error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analíticas</h1>
          <p className="text-muted-foreground mt-1">
            Tu asistente de tráfico digital con IA.
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg w-full">
            <CardHeader className="text-center pt-10">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Bot className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl">Tu Trafficker IA</CardTitle>
              <CardDescription className="text-base mt-2 max-w-sm mx-auto">
                Analiza el rendimiento de tus campañas de Meta Ads, detecta problemas y
                aplica optimizaciones con un solo clic. Tu experto en tráfico digital,
                disponible 24/7.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-10">
              <Button
                size="lg"
                onClick={() => fetchAnalysis(dateRange)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg"
              >
                <Brain className="h-5 w-5 mr-2" />
                Analizar mis campañas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // =====================================================================
  // LOADING STATE
  // =====================================================================
  if (loading && !analysis) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analíticas</h1>
          <p className="text-muted-foreground mt-1">
            Tu asistente de tráfico digital con IA.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 animate-pulse">
            <Bot className="h-10 w-10 text-white" />
          </div>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="text-lg text-muted-foreground">
              Analizando tus campañas...
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            Estamos revisando métricas, comparando con benchmarks de la industria y
            generando recomendaciones personalizadas. Esto puede tardar unos segundos.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================================
  // ERROR STATE
  // =====================================================================
  if (error && !analysis) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analíticas</h1>
          <p className="text-muted-foreground mt-1">
            Tu asistente de tráfico digital con IA.
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-lg w-full border-red-200 dark:border-red-900">
            <CardHeader className="text-center pt-10">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <CardTitle>Error en el análisis</CardTitle>
              <CardDescription className="mt-2">{error}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-10">
              <Button
                onClick={() => fetchAnalysis(dateRange)}
                variant="outline"
              >
                <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : 'hidden'}`} />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // =====================================================================
  // FULL ANALYSIS VIEW
  // =====================================================================
  if (!analysis) return null;

  return (
    <div className="space-y-8">
      {/* ============================================================= */}
      {/* SECTION 1 — Panel de Control del Trafficker                     */}
      {/* ============================================================= */}
      <section className="space-y-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Tu Trafficker IA</h1>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Analizando tus campañas...' : 'Análisis listo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={(val: string) => setDateRange(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">Últimos 7 días</SelectItem>
                <SelectItem value="last_14_days">Últimos 14 días</SelectItem>
                <SelectItem value="last_30_days">Últimos 30 días</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => fetchAnalysis(dateRange)}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Analizar ahora
            </Button>
          </div>
        </div>

        {/* Health Score Gauge */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <HealthGauge score={analysis.health_score} />
              {analysisTimestamp && (
                <p className="text-xs text-muted-foreground">
                  Último análisis: {formatDate(analysisTimestamp)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overall Assessment */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-base">Evaluación General</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {analysis.overall_assessment}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ============================================================= */}
      {/* SECTION 2 — Diagnóstico por Campaña                           */}
      {/* ============================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold">Diagnóstico por Campaña</h2>
        </div>

        {analysis.campaign_diagnostics.length === 0 ? (
          <Card>
            <CardHeader className="text-center py-8">
              <CardDescription>No se encontraron campañas para diagnosticar.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-3">
            {analysis.campaign_diagnostics.map((diag) => {
              const isExpanded = expandedCampaigns.has(diag.campaign_id);
              const scoreColor = healthColor(diag.score);

              return (
                <Card key={diag.campaign_id} className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => toggleCampaign(diag.campaign_id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="text-lg font-bold shrink-0"
                            style={{ color: scoreColor }}
                          >
                            {diag.score}
                          </span>
                          <span className="font-medium truncate">{diag.campaign_name}</span>
                          <TrendIcon trend={diag.trend} />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {diag.trend === 'improving'
                              ? 'Mejorando'
                              : diag.trend === 'declining'
                                ? 'Decayendo'
                                : 'Estable'}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </button>

                  {isExpanded && (
                    <CardContent className="border-t pt-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {(
                          Object.entries(diag.metrics_status) as [
                            string,
                            'good' | 'warning' | 'critical',
                          ][]
                        ).map(([metric, status]) => (
                          <div
                            key={metric}
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
                          >
                            <MetricDot status={status} />
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide">
                                {metric.toUpperCase()}
                              </p>
                              <p
                                className={`text-xs ${
                                  status === 'good'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : status === 'warning'
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {STATUS_LABEL[status]}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================================================= */}
      {/* SECTION 3 — Recomendaciones Accionables                       */}
      {/* ============================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold">Recomendaciones Accionables</h2>
        </div>

        {analysis.recommendations.length === 0 ? (
          <Card>
            <CardHeader className="text-center py-8">
              <CardDescription>
                No hay recomendaciones en este momento. Tus campañas están funcionando bien.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-3">
            {analysis.recommendations.map((rec, index) => {
              const isExpanded = expandedRecs.has(index);
              const isDirect = DIRECT_ACTIONS.has(rec.action_type);
              const isApplied = appliedActions.has(rec.title);
              const isApplying = applyingAction === rec.target_id;

              return (
                <Card key={`${rec.target_id}-${index}`}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PriorityBadge priority={rec.priority} />
                          <Badge variant="outline" className="text-xs">
                            {rec.target_name}
                          </Badge>
                        </div>
                        <h3 className="font-semibold">{rec.title}</h3>

                        {/* Expandable explanation */}
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
                          onClick={() => toggleRec(index)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Ocultar explicación
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Ver explicación
                            </>
                          )}
                        </button>
                        {isExpanded && (
                          <p className="text-sm text-muted-foreground leading-relaxed mt-1 p-3 bg-muted/50 rounded-lg">
                            {rec.explanation}
                          </p>
                        )}

                        {/* Estimated impact */}
                        <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-4 w-4" />
                          <span>{rec.estimated_impact}</span>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="shrink-0 flex items-center">
                        {isApplied ? (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            <Check className="h-4 w-4" />
                            <span className="text-sm font-medium">Aplicado</span>
                          </div>
                        ) : isDirect ? (
                          <Button
                            onClick={() => handleApplyRecommendation(rec)}
                            disabled={isApplying}
                            size="sm"
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                          >
                            {isApplying ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Zap className="h-4 w-4 mr-2" />
                            )}
                            Aplicar ahora
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.location.href = `/campaigns/${rec.target_id}/edit`;
                            }}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Ver cómo
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}

        {/* Action History */}
        {actionHistory.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Historial de acciones</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Recomendación
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Acción
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Destino
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Resultado
                      </th>
                      <th className="text-left py-2 font-medium text-muted-foreground">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {actionHistory.slice(0, 10).map((entry, i) => (
                      <tr key={`${entry.id}-${i}`} className="border-b last:border-0">
                        <td className="py-2 pr-4 max-w-[200px] truncate">
                          {entry.recommendation_title}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant="secondary" className="text-xs">
                            {ACTION_LABELS[entry.action_type] || entry.action_type}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {entry.target_name || '-'}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${
                              entry.result === 'success'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {entry.result === 'success' ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            {entry.result === 'success' ? 'Exitoso' : 'Error'}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground text-xs">
                          {formatDate(entry.applied_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ============================================================= */}
      {/* SECTION 3.5 — Estado de Features                              */}
      {/* ============================================================= */}
      <FeatureStatusSection />

      {/* ============================================================= */}
      {/* SECTION 3.6 — Historial de Análisis                           */}
      {/* ============================================================= */}
      {analysisHistory.length > 1 && (
        <section className="space-y-4">
          <button
            type="button"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-foreground">Historial de Análisis</h2>
            <Badge variant="secondary" className="ml-1">{analysisHistory.length}</Badge>
            {showHistory ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showHistory && (
            <div className="space-y-3">
              {analysisHistory.map((entry, i) => {
                const isCurrent = i === 0;
                const prevEntry = analysisHistory[i + 1];
                const scoreDiff = prevEntry ? entry.health_score - prevEntry.health_score : 0;

                return (
                  <Card
                    key={entry.id}
                    className={isCurrent ? 'border-indigo-200 dark:border-indigo-800' : ''}
                  >
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-2xl font-bold"
                            style={{ color: healthColor(entry.health_score) }}
                          >
                            {entry.health_score}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {formatDate(entry.created_at)}
                              </span>
                              {isCurrent && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-indigo-500">
                                  Actual
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-md mt-0.5">
                              {entry.overall_assessment}
                            </p>
                          </div>
                        </div>
                        {scoreDiff !== 0 && (
                          <div className={`flex items-center gap-1 text-sm font-medium ${
                            scoreDiff > 0 ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            {scoreDiff > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {scoreDiff > 0 ? '+' : ''}{scoreDiff} pts
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ============================================================= */}
      {/* SECTION 4 — Insights Profundos                                */}
      {/* ============================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold">Insights Profundos</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-sm">Mejor Audiencia</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {analysis.audience_insights.best_segment}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Layout className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-sm">Mejor Placement</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {analysis.audience_insights.best_placement}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-sm">Mejor Horario</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {analysis.audience_insights.best_schedule}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Image className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle className="text-sm">Mejor Creativo</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {analysis.audience_insights.creative_winner}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============================================================= */}
      {/* SECTION 5 — Predicción a 30 Días + Benchmarks                 */}
      {/* ============================================================= */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prediction */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base">Predicción a 30 Días</CardTitle>
              </div>
              <CardDescription>
                Comparación entre la trayectoria actual y la optimizada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Métrica
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Actual
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Optimizada
                      </th>
                      <th className="text-left py-2 font-medium text-muted-foreground">
                        Mejora
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Leads */}
                    <tr className="border-b">
                      <td className="py-3 pr-4 font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        Leads
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatNumber(analysis.prediction_30d.current_trajectory.leads)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-emerald-600 dark:text-emerald-400">
                        {formatNumber(analysis.prediction_30d.optimized_trajectory.leads)}
                      </td>
                      <td className="py-3">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {pctChange(
                            analysis.prediction_30d.current_trajectory.leads,
                            analysis.prediction_30d.optimized_trajectory.leads,
                          )}
                        </span>
                      </td>
                    </tr>
                    {/* Spend */}
                    <tr className="border-b">
                      <td className="py-3 pr-4 font-medium flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                        Gasto
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatCurrency(analysis.prediction_30d.current_trajectory.spend)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(analysis.prediction_30d.optimized_trajectory.spend)}
                      </td>
                      <td className="py-3">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          {analysis.prediction_30d.optimized_trajectory.spend <=
                          analysis.prediction_30d.current_trajectory.spend ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {pctChange(
                            analysis.prediction_30d.current_trajectory.spend,
                            analysis.prediction_30d.optimized_trajectory.spend,
                          )}
                        </span>
                      </td>
                    </tr>
                    {/* CPA */}
                    <tr>
                      <td className="py-3 pr-4 font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        CPA
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatCurrency(analysis.prediction_30d.current_trajectory.cpa)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(analysis.prediction_30d.optimized_trajectory.cpa)}
                      </td>
                      <td className="py-3">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {pctChange(
                            analysis.prediction_30d.current_trajectory.cpa,
                            analysis.prediction_30d.optimized_trajectory.cpa,
                          )}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Benchmarks */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base">Benchmarks de Industria</CardTitle>
              </div>
              <CardDescription>
                Cómo se comparan tus métricas con el promedio y los mejores de la industria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <BenchmarkBar
                label="CTR"
                yours={analysis.industry_comparison.ctr.yours}
                industryAvg={analysis.industry_comparison.ctr.industry_avg}
                topPerformers={analysis.industry_comparison.ctr.top_performers}
                lowerIsBetter={false}
              />
              <BenchmarkBar
                label="CPC"
                yours={analysis.industry_comparison.cpc.yours}
                industryAvg={analysis.industry_comparison.cpc.industry_avg}
                topPerformers={analysis.industry_comparison.cpc.top_performers}
                lowerIsBetter={true}
              />
              <BenchmarkBar
                label="CPA"
                yours={analysis.industry_comparison.cpa.yours}
                industryAvg={analysis.industry_comparison.cpa.industry_avg}
                topPerformers={analysis.industry_comparison.cpa.top_performers}
                lowerIsBetter={true}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

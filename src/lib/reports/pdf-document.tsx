import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles } from './pdf-styles';
import { PDFBarChart, PDFSpendChart } from './pdf-charts';
import type { CampaignAnalytics } from '@/lib/analytics/campaign-data';
import type { ReportAnalysisOutput } from '@/lib/gemini/validators';

interface ReportDocumentProps {
  data: CampaignAnalytics & {
    aiAnalysis?: ReportAnalysisOutput | null;
    reportMeta: {
      generatedAt: string;
      days: number;
    };
  };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const DAYS_LABEL: Record<number, string> = {
  7: 'Últimos 7 días',
  14: 'Últimos 14 días',
  30: 'Últimos 30 días',
};

export function ReportDocument({ data }: ReportDocumentProps) {
  const campaign = data.campaign as { name?: string; objective?: string };
  const kpiItems = [
    { label: 'Impresiones', value: formatNumber(data.kpis.impressions) },
    { label: 'Alcance', value: formatNumber(data.kpis.reach) },
    { label: 'Clics', value: formatNumber(data.kpis.clicks) },
    { label: 'Gasto', value: `$${data.kpis.spend.toLocaleString()}` },
    { label: 'Conversiones', value: formatNumber(data.kpis.conversions) },
    { label: 'CTR', value: `${data.kpis.ctr}%` },
    { label: 'CPC', value: `$${data.kpis.cpc}` },
    { label: 'CPM', value: `$${data.kpis.cpm}` },
    { label: 'CPA', value: `$${data.kpis.cpa}` },
    { label: 'Frecuencia', value: `${data.kpis.frequency}x` },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MetaAds Autopilot</Text>
          <Text style={styles.headerDate}>
            {new Date(data.reportMeta.generatedAt).toLocaleDateString('es-MX', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
        </View>

        <Text style={styles.campaignName}>{campaign.name || 'Campaña'}</Text>
        <Text style={styles.subtitle}>
          Reporte de rendimiento — {DAYS_LABEL[data.reportMeta.days] || `Últimos ${data.reportMeta.days} días`}
        </Text>

        {/* KPIs */}
        <Text style={styles.sectionTitle}>KPIs Principales</Text>
        <View style={styles.kpiGrid}>
          {kpiItems.map((kpi) => (
            <View key={kpi.label} style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Spend Chart */}
        {data.timeSeries.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Rendimiento Temporal</Text>
            <PDFSpendChart data={data.timeSeries} />
          </>
        )}

        {/* Breakdowns */}
        <Text style={styles.sectionTitle}>Desglose de Audiencia</Text>
        <View style={styles.breakdownContainer}>
          {data.breakdowns.age.length > 0 && (
            <PDFBarChart data={data.breakdowns.age} title="Por Edad" />
          )}
          {data.breakdowns.gender.length > 0 && (
            <PDFBarChart data={data.breakdowns.gender} title="Por Género" />
          )}
          {data.breakdowns.placement.length > 0 && (
            <PDFBarChart data={data.breakdowns.placement} title="Por Ubicación" />
          )}
          {data.breakdowns.device.length > 0 && (
            <PDFBarChart data={data.breakdowns.device} title="Por Dispositivo" />
          )}
        </View>

        <Text style={styles.footer}>
          Generado por MetaAds Autopilot — {new Date(data.reportMeta.generatedAt).toISOString()}
        </Text>
      </Page>

      {/* AI Analysis page (if available) */}
      {data.aiAnalysis && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Análisis IA</Text>
            <Text style={styles.headerDate}>
              Calificación: {data.aiAnalysis.overall_rating}
            </Text>
          </View>

          <View style={styles.aiSection}>
            <Text style={styles.aiRating}>
              Calificación general: {data.aiAnalysis.overall_rating}
            </Text>

            <Text style={{ ...styles.sectionTitle, marginTop: 0 }}>Resumen Ejecutivo</Text>
            <Text style={styles.aiText}>{data.aiAnalysis.executive_summary}</Text>

            <Text style={styles.sectionTitle}>Fortalezas</Text>
            {data.aiAnalysis.strengths.map((s, i) => (
              <Text key={i} style={styles.strengthItem}>+ {s}</Text>
            ))}

            <Text style={styles.sectionTitle}>Áreas de Mejora</Text>
            {data.aiAnalysis.weaknesses.map((w, i) => (
              <Text key={i} style={styles.weaknessItem}>- {w}</Text>
            ))}

            <Text style={styles.sectionTitle}>Recomendaciones</Text>
            {data.aiAnalysis.recommendations.map((rec, i) => (
              <View key={i} style={styles.recCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.recAction}>{rec.action}</Text>
                  <Text style={styles.recPriority}>
                    {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Baja'}
                  </Text>
                </View>
                <Text style={styles.recImpact}>{rec.expected_impact}</Text>
              </View>
            ))}

            <View style={{ marginTop: 15, padding: 10, backgroundColor: '#e0e7ff', borderRadius: 6 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
                {data.aiAnalysis.conclusion}
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>
            Generado por MetaAds Autopilot — {new Date(data.reportMeta.generatedAt).toISOString()}
          </Text>
        </Page>
      )}
    </Document>
  );
}

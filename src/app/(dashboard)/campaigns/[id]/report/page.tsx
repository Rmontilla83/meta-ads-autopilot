'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { ReportConfigForm, type ReportConfig } from '@/components/reports/report-config-form';
import { WebReport } from '@/components/reports/web-report';
import { UpgradeModal } from '@/components/plan/upgrade-modal';
import { useUser } from '@/hooks/useUser';
import { usePlan } from '@/hooks/usePlan';
import { toast } from 'sonner';

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile } = useUser();
  const { canUseFeature } = usePlan(profile?.plan);

  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [sections, setSections] = useState({ kpis: true, timeSeries: true, breakdowns: true, aiAnalysis: true });
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const hasAccess = canUseFeature('pdfReports');

  const handleGenerate = async (config: ReportConfig) => {
    if (!hasAccess) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    setSections(config.sections);
    try {
      const res = await fetch(
        `/api/reports/campaign/${id}?days=${config.days}&ai=${config.includeAI}`
      );
      if (res.status === 403) {
        setShowUpgrade(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Error al generar reporte');
        return;
      }
      const data = await res.json();
      setReportData(data);
    } catch {
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/reports/campaign/${id}/pdf?days=${(reportData as { reportMeta?: { days?: number } })?.reportMeta?.days || 30}&ai=${(reportData as { aiAnalysis?: unknown })?.aiAnalysis ? 'true' : 'false'}`);
      if (!res.ok) {
        toast.error('Error al generar PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-campana-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/campaigns/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Reporte de campaña</h1>
        </div>
        <UpgradeModal
          open={true}
          onOpenChange={() => router.push(`/campaigns/${id}`)}
          feature="pdf_reports"
          planRequired="growth"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/campaigns/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Reporte de campaña</h1>
        </div>
        {reportData && (
          <Button variant="outline" onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Descargar PDF
          </Button>
        )}
      </div>

      {!reportData && (
        <div className="max-w-md">
          <ReportConfigForm onGenerate={handleGenerate} loading={loading} />
        </div>
      )}

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {reportData && <WebReport data={reportData as any} sections={sections} />}

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="pdf_reports"
        planRequired="growth"
      />
    </div>
  );
}

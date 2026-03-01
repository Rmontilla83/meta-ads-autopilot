'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Rocket, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiplyMode } from '@/components/campaigns/bulk/multiply-mode';
import { CSVMode } from '@/components/campaigns/bulk/csv-mode';
import { AIMode } from '@/components/campaigns/bulk/ai-mode';
import { PreviewTable } from '@/components/campaigns/bulk/preview-table';
import { BulkPublishModal } from '@/components/campaigns/bulk/bulk-publish-modal';
import { SaveTemplateModal } from '@/components/campaigns/bulk/save-template-modal';
import type { GeneratedCampaign } from '@/lib/gemini/types';

export default function BulkCreatePage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<GeneratedCampaign[]>([]);
  const [publishOpen, setPublishOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateCampaign, setTemplateCampaign] = useState<GeneratedCampaign | null>(null);

  const handleGenerate = (newCampaigns: GeneratedCampaign[]) => {
    setCampaigns(prev => [...prev, ...newCampaigns]);
  };

  const handleRemove = (index: number) => {
    setCampaigns(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Creación masiva</h1>
            <p className="text-muted-foreground mt-1">
              Crea múltiples campañas a la vez
            </p>
          </div>
        </div>
      </div>

      {/* Input Modes */}
      <Card>
        <CardHeader>
          <CardTitle>Modo de creación</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="multiply">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="multiply">Multiplicar</TabsTrigger>
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="ai">IA</TabsTrigger>
            </TabsList>
            <TabsContent value="multiply" className="mt-4">
              <MultiplyMode onGenerate={handleGenerate} />
            </TabsContent>
            <TabsContent value="csv" className="mt-4">
              <CSVMode onGenerate={handleGenerate} />
            </TabsContent>
            <TabsContent value="ai" className="mt-4">
              <AIMode onGenerate={handleGenerate} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview */}
      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{campaigns.length} campañas preparadas</CardTitle>
              <div className="flex gap-2">
                {campaigns.length === 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTemplateCampaign(campaigns[0]);
                      setTemplateOpen(true);
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar plantilla
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCampaigns([])}
                >
                  Limpiar todo
                </Button>
                <Button size="sm" onClick={() => setPublishOpen(true)}>
                  <Rocket className="h-4 w-4 mr-2" />
                  Publicar todas
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <PreviewTable campaigns={campaigns} onRemove={handleRemove} />
          </CardContent>
        </Card>
      )}

      {/* Publish Modal */}
      <BulkPublishModal
        open={publishOpen}
        onOpenChange={setPublishOpen}
        campaigns={campaigns}
        onComplete={() => {
          setCampaigns([]);
          router.push('/campaigns');
        }}
      />

      {/* Save Template Modal */}
      <SaveTemplateModal
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        campaign={templateCampaign}
      />
    </div>
  );
}

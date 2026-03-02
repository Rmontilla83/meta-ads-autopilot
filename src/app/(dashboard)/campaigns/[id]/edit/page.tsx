'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Rocket, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabCampaign } from '@/components/campaigns/editor/tab-campaign';
import { TabAdSets } from '@/components/campaigns/editor/tab-ad-sets';
import { TabAds } from '@/components/campaigns/editor/tab-ads';
import { TabBudget } from '@/components/campaigns/editor/tab-budget';
import { TabSummary } from '@/components/campaigns/editor/tab-summary';
import { PublishModal } from '@/components/campaigns/publish-modal';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import type { GeneratedCampaign } from '@/lib/gemini/types';

export default function CampaignEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user, businessProfile } = useUser();
  const campaignId = params.id as string;

  const [campaignData, setCampaignData] = useState<GeneratedCampaign | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load campaign
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !data) {
        router.push('/campaigns');
        return;
      }

      setCampaignName(data.name);
      setCampaignData(data.campaign_data as unknown as GeneratedCampaign);
      setLoading(false);
    };

    load();
  }, [user, campaignId, router]);

  // Autosave with debounce
  const autoSave = useCallback(
    async (data: GeneratedCampaign) => {
      if (!user) return;

      setSaving(true);
      const supabase = createClient();
      await supabase
        .from('campaigns')
        .update({
          name: data.campaign.name,
          objective: data.campaign.objective,
          campaign_data: data as unknown as Record<string, unknown>,
        })
        .eq('id', campaignId);

      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [user, campaignId]
  );

  const handleChange = (data: GeneratedCampaign) => {
    setCampaignData(data);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => autoSave(data), 2000);
  };

  if (loading || !campaignData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{campaignData.campaign.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {saving && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Guardando...</span>
                </>
              )}
              {saved && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>Guardado</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => autoSave(campaignData)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
          <Button
            size="sm"
            onClick={() => setShowPublish(true)}
          >
            <Rocket className="h-4 w-4 mr-2" />
            Publicar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaign">
        <TabsList>
          <TabsTrigger value="campaign">Campaña</TabsTrigger>
          <TabsTrigger value="adsets">Ad Sets</TabsTrigger>
          <TabsTrigger value="ads">Anuncios</TabsTrigger>
          <TabsTrigger value="budget">Presupuesto</TabsTrigger>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="campaign">
            <TabCampaign data={campaignData} onChange={handleChange} />
          </TabsContent>
          <TabsContent value="adsets">
            <TabAdSets data={campaignData} onChange={handleChange} />
          </TabsContent>
          <TabsContent value="ads">
            <TabAds
              data={campaignData}
              onChange={handleChange}
              businessName={businessProfile?.business_name}
              logoUrl={businessProfile?.logo_url || undefined}
            />
          </TabsContent>
          <TabsContent value="budget">
            <TabBudget data={campaignData} onChange={handleChange} />
          </TabsContent>
          <TabsContent value="summary">
            <TabSummary
              data={campaignData}
              businessName={businessProfile?.business_name}
              industry={businessProfile?.industry ?? undefined}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Publish Modal */}
      <PublishModal
        open={showPublish}
        onOpenChange={setShowPublish}
        campaignId={campaignId}
        campaignName={campaignData.campaign.name}
      />
    </div>
  );
}

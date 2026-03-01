'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Edit, Save, Rocket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/campaigns/chat-interface';
import { CampaignPreview } from '@/components/campaigns/campaign-preview';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import type { GeneratedCampaign } from '@/lib/gemini/types';

export default function NewCampaignPage() {
  const router = useRouter();
  const { businessProfile, user } = useUser();
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSaveDraft = async () => {
    if (!generatedCampaign || !user) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: generatedCampaign.campaign.name,
          status: 'draft',
          objective: generatedCampaign.campaign.objective,
          campaign_data: generatedCampaign as unknown as Record<string, unknown>,
        })
        .select('id')
        .single();

      if (error) throw error;
      router.push(`/campaigns/${data.id}/edit`);
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async () => {
    if (!generatedCampaign || !user) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: generatedCampaign.campaign.name,
          status: 'draft',
          objective: generatedCampaign.campaign.objective,
          campaign_data: generatedCampaign as unknown as Record<string, unknown>,
        })
        .select('id')
        .single();

      if (error) throw error;
      // Navigate to edit page where they can publish
      router.push(`/campaigns/${data.id}/edit`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Nueva campaña con IA</h1>
        </div>
      </div>

      {/* Split screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat - Left 40% */}
        <div className="w-2/5 border-r flex flex-col">
          <ChatInterface
            businessProfile={businessProfile}
            onCampaignGenerated={setGeneratedCampaign}
            generatedCampaign={generatedCampaign}
          />
        </div>

        {/* Preview - Right 60% */}
        <div className="w-3/5 flex flex-col">
          <CampaignPreview campaign={generatedCampaign} />
        </div>
      </div>

      {/* Bottom action bar */}
      {generatedCampaign && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGeneratedCampaign(null)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerar
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar borrador
            </Button>
            <Button
              size="sm"
              onClick={handleLaunch}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
              Lanzar campaña
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Save, Pencil, Loader2, MessageSquare, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/campaigns/chat-interface';
import { CampaignPreview } from '@/components/campaigns/campaign-preview';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { GeneratedCampaign } from '@/lib/gemini/types';

export default function NewCampaignPage() {
  const router = useRouter();
  const { businessProfile, user } = useUser();
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');

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
    } catch {
      toast.error('Error al guardar el borrador');
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
      router.push(`/campaigns/${data.id}/edit`);
    } catch {
      toast.error('Error al crear la campaña');
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

        {/* Mobile view toggle */}
        <div className="flex md:hidden gap-1">
          <Button
            variant={mobileView === 'chat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMobileView('chat')}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Chat
          </Button>
          <Button
            variant={mobileView === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMobileView('preview')}
            disabled={!generatedCampaign}
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>
      </div>

      {/* Split screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat - Left 40% on desktop, full on mobile when active */}
        <div className={`w-full md:w-2/5 border-r flex flex-col ${mobileView !== 'chat' ? 'hidden md:flex' : ''}`}>
          <ChatInterface
            businessProfile={businessProfile}
            onCampaignGenerated={(campaign) => {
              setGeneratedCampaign(campaign);
              setMobileView('preview');
            }}
            generatedCampaign={generatedCampaign}
          />
        </div>

        {/* Preview - Right 60% on desktop, full on mobile when active */}
        <div className={`w-full md:w-3/5 flex flex-col ${mobileView !== 'preview' ? 'hidden md:flex' : ''}`}>
          <CampaignPreview campaign={generatedCampaign} logoUrl={businessProfile?.logo_url || undefined} />
        </div>
      </div>

      {/* Bottom action bar */}
      {generatedCampaign && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setGeneratedCampaign(null);
              setMobileView('chat');
            }}
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
              <span className="hidden sm:inline">Guardar borrador</span>
              <span className="sm:hidden">Guardar</span>
            </Button>
            <Button
              size="sm"
              onClick={handleLaunch}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
              <span className="hidden sm:inline">Revisar y editar</span>
              <span className="sm:hidden">Editar</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

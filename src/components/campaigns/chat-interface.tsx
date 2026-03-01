'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/lib/gemini/types';
import type { GeneratedCampaign } from '@/lib/gemini/types';
import type { BusinessProfile } from '@/types';

interface ChatInterfaceProps {
  businessProfile: BusinessProfile | null;
  onCampaignGenerated: (campaign: GeneratedCampaign) => void;
  generatedCampaign: GeneratedCampaign | null;
}

const QUICK_ACTIONS = [
  { label: 'Quiero más clientes', message: 'Quiero crear una campaña para conseguir más clientes para mi negocio' },
  { label: 'Promocionar producto', message: 'Necesito promocionar un producto o servicio específico' },
  { label: 'Evento especial', message: 'Quiero crear una campaña para un evento especial o temporada' },
  { label: 'Oferta de temporada', message: 'Quiero lanzar una oferta o promoción especial' },
];

export function ChatInterface({ businessProfile, onCampaignGenerated, generatedCampaign }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // If no campaign yet, generate one; otherwise chat
    if (!generatedCampaign) {
      try {
        const response = await fetch('/api/ai/generate-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            business_profile: businessProfile,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al generar la campaña');
        }

        onCampaignGenerated(data.campaign);

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: `¡He creado una campaña "${data.campaign.campaign.name}" para ti! 🎯\n\nEstrategia: ${data.campaign.strategy.rationale}\n\nPuedes ver los detalles en la vista previa. ¿Quieres que modifique algo?`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } catch (error) {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Error al generar la campaña. Intenta de nuevo.',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } else {
      // Stream chat response
      try {
        setIsStreaming(true);
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            campaign_context: generatedCampaign,
            business_profile: businessProfile,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error en el chat');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No se pudo leer la respuesta');

        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullText += parsed.text;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: fullText,
                    };
                    return updated;
                  });
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }

        // Check for campaign update in response
        if (fullText.includes('[CAMPAIGN_UPDATE]')) {
          const jsonStart = fullText.indexOf('[CAMPAIGN_UPDATE]') + '[CAMPAIGN_UPDATE]'.length;
          const jsonStr = fullText.slice(jsonStart).trim();
          try {
            const updatedCampaign = JSON.parse(jsonStr);
            onCampaignGenerated(updatedCampaign);
          } catch {
            // Not valid JSON, ignore
          }
        }
      } catch (error) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: error instanceof Error ? error.message : 'Error en el chat. Intenta de nuevo.',
          };
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Asistente de Campañas IA</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Cuéntame sobre tu negocio y qué quieres lograr. Crearé una campaña optimizada para ti.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => sendMessage(action.message)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted'
                }`}>
                  {msg.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && !isStreaming && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe tu campaña ideal..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

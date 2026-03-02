'use client';

import Image from 'next/image';
import { MessageCircle, Share2, ThumbsUp, Globe, MoreHorizontal, ImageIcon, Play, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CarouselCard } from '@/lib/gemini/types';

interface AdPreviewMockProps {
  format?: 'single_image' | 'carousel' | 'video';
  primaryText: string;
  headline: string;
  description: string;
  callToAction: string;
  pageName?: string;
  logoUrl?: string;
  viewMode?: 'feed' | 'stories' | 'reels';
  imageUrl?: string;
  videoUrl?: string;
  carouselImages?: CarouselCard[];
}

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: 'Más información',
  SHOP_NOW: 'Comprar',
  SIGN_UP: 'Registrarse',
  CONTACT_US: 'Contactar',
  GET_OFFER: 'Obtener oferta',
  BOOK_TRAVEL: 'Reservar',
  DOWNLOAD: 'Descargar',
  WATCH_MORE: 'Ver más',
  SEND_MESSAGE: 'Enviar mensaje',
  CALL_NOW: 'Llamar',
  APPLY_NOW: 'Aplicar',
  SUBSCRIBE: 'Suscribirse',
};

export function AdPreviewMock({
  format = 'single_image',
  primaryText,
  headline,
  description,
  callToAction,
  pageName = 'Tu Negocio',
  logoUrl,
  viewMode = 'feed',
  imageUrl,
  videoUrl,
  carouselImages,
}: AdPreviewMockProps) {
  const ctaLabel = CTA_LABELS[callToAction] || callToAction;

  if (viewMode === 'stories' || viewMode === 'reels') {
    return (
      <div className="w-[220px] h-[390px] bg-zinc-900 rounded-2xl overflow-hidden relative flex-shrink-0">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-700 to-zinc-900">
          {imageUrl ? (
            <Image src={imageUrl} alt="Ad creative" fill className="object-cover" />
          ) : (
            <ImageIcon className="h-12 w-12 text-zinc-500" />
          )}
          {format === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
              </div>
            </div>
          )}
        </div>
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
          {logoUrl ? (
            <div className="h-8 w-8 rounded-full overflow-hidden bg-white flex-shrink-0">
              <Image src={logoUrl} alt="" width={32} height={32} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-zinc-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-white text-xs font-semibold truncate">{pageName}</p>
            <p className="text-zinc-400 text-[10px]">Publicidad</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-xs mb-2 line-clamp-2">{primaryText}</p>
          <Button size="sm" className="w-full text-xs h-7" variant="secondary">
            {ctaLabel}
          </Button>
        </div>
      </div>
    );
  }

  // Feed format
  return (
    <div className="w-full max-w-[340px] bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="p-3 flex items-center gap-2">
        {logoUrl ? (
          <div className="h-9 w-9 rounded-full overflow-hidden bg-white flex-shrink-0">
            <Image src={logoUrl} alt="" width={36} height={36} className="object-cover w-full h-full" />
          </div>
        ) : (
          <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {pageName.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{pageName}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Publicidad</span>
            <span>·</span>
            <Globe className="h-3 w-3" />
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Primary text */}
      <div className="px-3 pb-2">
        <p className="text-sm">{primaryText}</p>
      </div>

      {/* Creative area */}
      {format === 'video' ? (
        <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center relative overflow-hidden">
          {videoUrl ? (
            <video src={videoUrl} controls className="w-full h-full object-cover" />
          ) : imageUrl ? (
            <>
              <Image src={imageUrl} alt="Video thumbnail" fill className="object-cover opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                  <Play className="h-7 w-7 text-white ml-0.5" fill="white" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-500">
              <Film className="h-12 w-12" />
              <span className="text-xs">Video</span>
            </div>
          )}
        </div>
      ) : format === 'carousel' ? (
        <div className="w-full aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden">
          {carouselImages?.[0]?.image_url ? (
            <Image src={carouselImages[0].image_url} alt="Carousel card 1" fill className="object-cover" />
          ) : imageUrl ? (
            <Image src={imageUrl} alt="Ad creative" fill className="object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <div className="flex gap-1">
                <ImageIcon className="h-10 w-10" />
                <ImageIcon className="h-10 w-10 opacity-50" />
              </div>
              <span className="text-xs">Carrusel</span>
            </div>
          )}
          {/* Carousel dots */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {(carouselImages && carouselImages.length > 0 ? carouselImages : [1, 2, 3]).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-zinc-400/50'}`} />
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative overflow-hidden">
          {imageUrl ? (
            <Image src={imageUrl} alt="Ad creative" fill className="object-cover" />
          ) : (
            <ImageIcon className="h-16 w-16 text-zinc-400" />
          )}
        </div>
      )}

      {/* Link bar */}
      <div className="px-3 py-2 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase truncate">{description || 'tu-sitio.com'}</p>
          <p className="text-sm font-semibold truncate">{headline}</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs ml-2 flex-shrink-0">
          {ctaLabel}
        </Button>
      </div>

      {/* Reactions bar */}
      <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around">
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-600">
          <ThumbsUp className="h-4 w-4" />
          <span>Me gusta</span>
        </button>
        <button className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          <span>Comentar</span>
        </button>
        <button className="flex items-center gap-1 text-xs text-muted-foreground">
          <Share2 className="h-4 w-4" />
          <span>Compartir</span>
        </button>
      </div>
    </div>
  );
}

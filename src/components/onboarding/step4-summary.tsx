'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle2, Loader2, Building2, Link2, Target } from 'lucide-react';
import type { BusinessFormData } from './step1-business';
import type { GoalsFormData } from './step3-goals';

interface Step4Props {
  businessData: BusinessFormData;
  metaData: {
    ad_account_name: string;
    page_name: string;
    pixel_name: string;
  };
  goalsData: GoalsFormData;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}

export function Step4Summary({ businessData, metaData, goalsData, onConfirm, onBack, loading }: Step4Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Resumen</h2>
        <p className="text-muted-foreground">
          Revisa tu configuración antes de comenzar.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-medium">{businessData.business_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Industria</span>
            <span className="font-medium">{businessData.industry}</span>
          </div>
          {businessData.location && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ubicación</span>
              <span className="font-medium">{businessData.location}</span>
            </div>
          )}
          {businessData.website && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Web</span>
              <span className="font-medium truncate ml-4">{businessData.website}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" /> Conexión Meta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cuenta publicitaria</span>
            <span className="font-medium">{metaData.ad_account_name || 'No seleccionada'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Página de Facebook</span>
            <span className="font-medium">{metaData.page_name || 'No seleccionada'}</span>
          </div>
          {metaData.pixel_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Píxel</span>
              <span className="font-medium">{metaData.pixel_name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" /> Objetivos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Presupuesto</span>
            <span className="font-medium">{goalsData.monthly_budget}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Experiencia</span>
            <span className="font-medium capitalize">{goalsData.experience_level}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tono de marca</span>
            <span className="font-medium capitalize">{goalsData.brand_tone}</span>
          </div>
          <Separator />
          <div>
            <span className="text-muted-foreground">Objetivos:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {goalsData.objectives.map((obj) => (
                <span
                  key={obj}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {obj.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
        </Button>
        <Button onClick={onConfirm} disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Comenzar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

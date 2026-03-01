'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { PLANS } from '@/lib/plans';

const FEATURE_LABELS: Record<string, string> = {
  ai_generations: 'generaciones de IA',
  active_campaigns: 'campañas activas',
  auto_optimizer: 'optimizador automático',
  pdf_reports: 'reportes PDF',
  bulk_create: 'creación masiva',
  advanced_analytics: 'analíticas avanzadas',
};

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  planRequired?: string;
}

export function UpgradeModal({ open, onOpenChange, feature, planRequired }: UpgradeModalProps) {
  const router = useRouter();
  const requiredPlan = PLANS[planRequired || 'growth'] || PLANS.growth;
  const featureLabel = FEATURE_LABELS[feature] || feature;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          <DialogTitle className="text-center">
            Mejora tu plan
          </DialogTitle>
          <DialogDescription className="text-center">
            Has alcanzado el límite de <strong>{featureLabel}</strong> en tu plan actual.
            Mejora a <strong>{requiredPlan.name}</strong> para desbloquear esta función.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">Plan {requiredPlan.name} incluye:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {requiredPlan.features.slice(0, 5).map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-primary">✓</span> {f}
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold mt-2">
            Desde ${requiredPlan.price.monthly}/mes
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              router.push('/pricing');
            }}
          >
            Mejorar ahora
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Más tarde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

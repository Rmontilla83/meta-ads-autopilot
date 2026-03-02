'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AutomationRule, Campaign } from '@/types';

const METRICS = [
  { value: 'spend', label: 'Gasto ($)' },
  { value: 'ctr', label: 'CTR (%)' },
  { value: 'cpc', label: 'CPC ($)' },
  { value: 'cpm', label: 'CPM ($)' },
  { value: 'cpa', label: 'CPA ($)' },
  { value: 'impressions', label: 'Impresiones' },
  { value: 'clicks', label: 'Clics' },
  { value: 'conversions', label: 'Conversiones' },
  { value: 'reach', label: 'Alcance' },
  { value: 'frequency', label: 'Frecuencia' },
];

const OPERATORS = [
  { value: 'gt', label: 'Mayor que (>)' },
  { value: 'lt', label: 'Menor que (<)' },
  { value: 'gte', label: 'Mayor o igual (>=)' },
  { value: 'lte', label: 'Menor o igual (<=)' },
  { value: 'eq', label: 'Igual a (=)' },
];

const PERIODS = [
  { value: 'last_1_day', label: 'Último día' },
  { value: 'last_3_days', label: 'Últimos 3 días' },
  { value: 'last_7_days', label: 'Últimos 7 días' },
  { value: 'last_14_days', label: 'Últimos 14 días' },
  { value: 'last_30_days', label: 'Últimos 30 días' },
];

const ACTIONS = [
  { value: 'pause_campaign', label: 'Pausar campaña' },
  { value: 'activate_campaign', label: 'Activar campaña' },
  { value: 'increase_budget', label: 'Aumentar presupuesto (%)' },
  { value: 'decrease_budget', label: 'Reducir presupuesto (%)' },
  { value: 'notify_only', label: 'Solo notificar' },
];

const FREQUENCIES = [
  { value: 'hourly', label: 'Cada hora' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
];

interface RuleBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rule: AutomationRule) => void;
  campaigns: Campaign[];
  editRule?: AutomationRule | null;
}

export function RuleBuilderModal({
  open,
  onOpenChange,
  onSave,
  campaigns,
  editRule,
}: RuleBuilderModalProps) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(editRule?.name || '');
  const [conditionMetric, setConditionMetric] = useState<string>(editRule?.condition_metric || 'ctr');
  const [conditionOperator, setConditionOperator] = useState<string>(editRule?.condition_operator || 'lt');
  const [conditionValue, setConditionValue] = useState(String(editRule?.condition_value || ''));
  const [conditionPeriod, setConditionPeriod] = useState<string>(editRule?.condition_period || 'last_7_days');
  const [campaignIds, setCampaignIds] = useState<string[]>(editRule?.campaign_ids || []);
  const [actionType, setActionType] = useState<string>(editRule?.action_type || 'notify_only');
  const [actionValue, setActionValue] = useState(String(editRule?.action_value || ''));
  const [frequency, setFrequency] = useState<string>(editRule?.frequency || 'daily');
  const [maxExecutions, setMaxExecutions] = useState(String(editRule?.max_executions || '0'));

  const needsActionValue = actionType === 'increase_budget' || actionType === 'decrease_budget';

  const previewText = buildPreviewText();

  function buildPreviewText(): string {
    const metricLabel = METRICS.find(m => m.value === conditionMetric)?.label || conditionMetric;
    const operatorLabel = OPERATORS.find(o => o.value === conditionOperator)?.label || conditionOperator;
    const periodLabel = PERIODS.find(p => p.value === conditionPeriod)?.label || conditionPeriod;
    const actionLabel = ACTIONS.find(a => a.value === actionType)?.label || actionType;

    const scope = campaignIds.length === 0
      ? 'todas las campañas'
      : `${campaignIds.length} campaña(s)`;

    let action = actionLabel;
    if (needsActionValue && actionValue) {
      action += ` ${actionValue}%`;
    }

    return `Si ${metricLabel} es ${operatorLabel} ${conditionValue || '?'} en ${periodLabel} para ${scope}, entonces: ${action}`;
  }

  const handleSave = async () => {
    if (!name || !conditionValue) return;

    setSaving(true);
    try {
      const ruleData = {
        name,
        condition_metric: conditionMetric,
        condition_operator: conditionOperator,
        condition_value: parseFloat(conditionValue),
        condition_period: conditionPeriod,
        campaign_ids: campaignIds,
        action_type: actionType,
        action_value: needsActionValue ? parseFloat(actionValue) || 0 : 0,
        frequency,
        max_executions: parseInt(maxExecutions) || 0,
      };

      const url = editRule
        ? `/api/automation-rules/${editRule.id}`
        : '/api/automation-rules';

      const res = await fetch(url, {
        method: editRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      const data = await res.json();
      onSave(data.rule);
      onOpenChange(false);
    } catch {
      toast.error('Error al guardar la regla de automatización');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editRule ? 'Editar regla' : 'Nueva regla de automatización'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label>Nombre de la regla</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pausar campañas con CTR bajo"
            />
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label>Condición</Label>
            <div className="grid grid-cols-3 gap-2">
              <Select value={conditionMetric} onValueChange={setConditionMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRICS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={conditionOperator} onValueChange={setConditionOperator}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERATORS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="Valor"
              />
            </div>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label>Período de evaluación</Label>
            <Select value={conditionPeriod} onValueChange={setConditionPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>Campañas (dejar vacío = todas)</Label>
            <Select
              value={campaignIds.length > 0 ? 'selected' : 'all'}
              onValueChange={(v) => {
                if (v === 'all') setCampaignIds([]);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Todas las campañas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las campañas</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {campaigns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {campaigns
                  .filter(c => ['active', 'paused'].includes(c.status))
                  .map(c => (
                    <Button
                      key={c.id}
                      variant={campaignIds.includes(c.id) ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setCampaignIds(prev =>
                          prev.includes(c.id)
                            ? prev.filter(id => id !== c.id)
                            : [...prev, c.id]
                        );
                      }}
                    >
                      {c.name}
                    </Button>
                  ))}
              </div>
            )}
          </div>

          {/* Action */}
          <div className="space-y-2">
            <Label>Acción</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {needsActionValue && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  placeholder="Porcentaje"
                  min={1}
                  max={100}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            )}
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Máx. ejecuciones (0 = sin límite)</Label>
              <Input
                type="number"
                value={maxExecutions}
                onChange={(e) => setMaxExecutions(e.target.value)}
                min={0}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium text-xs text-muted-foreground mb-1">Vista previa</p>
            <p>{previewText}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name || !conditionValue}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editRule ? 'Guardar cambios' : 'Crear regla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

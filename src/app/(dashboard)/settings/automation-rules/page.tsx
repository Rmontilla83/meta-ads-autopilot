'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, History, Trash2, Pencil, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { RuleBuilderModal } from '@/components/automation/rule-builder-modal';
import { RuleHistoryModal } from '@/components/automation/rule-history-modal';
import type { AutomationRule, Campaign } from '@/types';

const METRIC_LABELS: Record<string, string> = {
  spend: 'Gasto', ctr: 'CTR', cpc: 'CPC', cpm: 'CPM', cpa: 'CPA',
  impressions: 'Impresiones', clicks: 'Clics', conversions: 'Conversiones',
  reach: 'Alcance', frequency: 'Frecuencia',
};

const OPERATOR_SYMBOLS: Record<string, string> = {
  gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=',
};

const ACTION_LABELS: Record<string, string> = {
  pause_campaign: 'Pausar',
  activate_campaign: 'Activar',
  increase_budget: 'Subir presupuesto',
  decrease_budget: 'Bajar presupuesto',
  notify_only: 'Notificar',
};

export default function AutomationRulesPage() {
  const { user, loading: userLoading } = useUser();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);
  const [historyRule, setHistoryRule] = useState<{ id: string; name: string } | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [rulesRes, campaignsRes] = await Promise.all([
        fetch('/api/automation-rules').then(r => r.json()),
        createClient()
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'paused', 'draft']),
      ]);

      setRules(rulesRes.rules || []);
      setCampaigns(campaignsRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleToggle = async (ruleId: string) => {
    const res = await fetch(`/api/automation-rules/${ruleId}/toggle`, { method: 'PATCH' });
    if (res.ok) {
      const data = await res.json();
      setRules(prev => prev.map(r => r.id === ruleId ? data.rule : r));
    }
  };

  const handleDelete = async (ruleId: string) => {
    const res = await fetch(`/api/automation-rules/${ruleId}`, { method: 'DELETE' });
    if (res.ok) {
      setRules(prev => prev.filter(r => r.id !== ruleId));
    }
  };

  const handleSave = (rule: AutomationRule) => {
    setRules(prev => {
      const exists = prev.find(r => r.id === rule.id);
      if (exists) return prev.map(r => r.id === rule.id ? rule : r);
      return [rule, ...prev];
    });
    setEditRule(null);
  };

  const handleSuggestRules = async () => {
    setSuggesting(true);
    try {
      const res = await fetch('/api/ai/suggest-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        // Create each suggested rule
        for (const suggestion of data.suggestions || []) {
          const createRes = await fetch('/api/automation-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...suggestion,
              is_enabled: false, // Created disabled for review
            }),
          });
          if (createRes.ok) {
            const created = await createRes.json();
            setRules(prev => [created.rule, ...prev]);
          }
        }
      }
    } catch (error) {
      console.error('Error suggesting rules:', error);
    } finally {
      setSuggesting(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reglas de automatización</h1>
          <p className="text-muted-foreground mt-1">
            Define condiciones para automatizar la gestión de tus campañas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSuggestRules} disabled={suggesting}>
            {suggesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Sugerir con IA
          </Button>
          <Button onClick={() => { setEditRule(null); setBuilderOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva regla
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-12">
            <CardTitle>No tienes reglas aún</CardTitle>
            <CardDescription>
              Crea reglas para automatizar acciones basadas en el rendimiento de tus campañas.
            </CardDescription>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={handleSuggestRules} disabled={suggesting}>
                {suggesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Sparkles className="h-4 w-4 mr-2" />
                Sugerencias IA
              </Button>
              <Button onClick={() => setBuilderOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear regla
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Activa</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Condición</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Ejecuciones</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Switch
                        checked={rule.is_enabled}
                        onCheckedChange={() => handleToggle(rule.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-sm">
                      {METRIC_LABELS[rule.condition_metric] || rule.condition_metric}{' '}
                      {OPERATOR_SYMBOLS[rule.condition_operator] || rule.condition_operator}{' '}
                      {rule.condition_value}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ACTION_LABELS[rule.action_type] || rule.action_type}
                        {(rule.action_type === 'increase_budget' || rule.action_type === 'decrease_budget') &&
                          ` ${rule.action_value}%`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rule.total_executions}
                      {rule.max_executions > 0 && ` / ${rule.max_executions}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setHistoryRule({ id: rule.id, name: rule.name })}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setEditRule(rule); setBuilderOpen(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <RuleBuilderModal
        open={builderOpen}
        onOpenChange={(open) => { setBuilderOpen(open); if (!open) setEditRule(null); }}
        onSave={handleSave}
        campaigns={campaigns}
        editRule={editRule}
      />

      {historyRule && (
        <RuleHistoryModal
          open={!!historyRule}
          onOpenChange={(open) => { if (!open) setHistoryRule(null); }}
          ruleId={historyRule.id}
          ruleName={historyRule.name}
        />
      )}
    </div>
  );
}

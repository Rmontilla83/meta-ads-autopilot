'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { GeneratedCampaign } from '@/lib/gemini/types';

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: 'Reconocimiento',
  OUTCOME_TRAFFIC: 'Tráfico',
  OUTCOME_ENGAGEMENT: 'Interacción',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Ventas',
  OUTCOME_APP_PROMOTION: 'App',
};

interface PreviewTableProps {
  campaigns: GeneratedCampaign[];
  onRemove: (index: number) => void;
}

export function PreviewTable({ campaigns, onRemove }: PreviewTableProps) {
  if (campaigns.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>#</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Objetivo</TableHead>
          <TableHead>Presupuesto</TableHead>
          <TableHead>Ad Sets</TableHead>
          <TableHead>Anuncios</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign, index) => (
          <TableRow key={index}>
            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="font-medium">{campaign.campaign.name}</TableCell>
            <TableCell>
              <Badge variant="secondary">
                {OBJECTIVE_LABELS[campaign.campaign.objective] || campaign.campaign.objective}
              </Badge>
            </TableCell>
            <TableCell>${campaign.campaign.daily_budget}/día</TableCell>
            <TableCell>{campaign.ad_sets.length}</TableCell>
            <TableCell>{campaign.ads.length}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onRemove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseCSVToCampaigns, generateCSVTemplate } from '@/lib/csv-parser';
import type { GeneratedCampaign } from '@/lib/gemini/types';

interface CSVModeProps {
  onGenerate: (campaigns: GeneratedCampaign[]) => void;
}

export function CSVMode({ onGenerate }: CSVModeProps) {
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    setError('');
    try {
      const campaigns = parseCSVToCampaigns(csvText);
      if (campaigns.length === 0) {
        setError('No se encontraron campañas válidas en el CSV.');
        return;
      }
      onGenerate(campaigns);
    } catch {
      setError('Error al parsear el CSV. Verifica el formato.');
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-campanas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Descargar plantilla
        </Button>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Subir CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <div className="space-y-2">
        <Label>Contenido CSV</Label>
        <Textarea
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); setError(''); }}
          placeholder="Pega tu CSV aquí o sube un archivo..."
          rows={10}
          className="font-mono text-xs"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleParse} disabled={!csvText.trim()} className="w-full">
        <FileText className="h-4 w-4 mr-2" />
        Parsear campañas
      </Button>
    </div>
  );
}

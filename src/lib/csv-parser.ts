import type { GeneratedCampaign } from '@/lib/gemini/types';

interface CSVRow {
  [key: string]: string;
}

export function parseCSVToCampaigns(csvText: string): GeneratedCampaign[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: CSVRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }

  return rows.map(row => rowToCampaign(row)).filter(Boolean) as GeneratedCampaign[];
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

function rowToCampaign(row: CSVRow): GeneratedCampaign | null {
  const name = row['nombre'] || row['name'] || '';
  if (!name) return null;

  const objective = row['objetivo'] || row['objective'] || 'OUTCOME_TRAFFIC';
  const dailyBudget = parseFloat(row['presupuesto_diario'] || row['daily_budget'] || '10');
  const countries = (row['paises'] || row['countries'] || 'MX').split(';').map(c => c.trim()).filter(Boolean);
  const ageMin = parseInt(row['edad_min'] || row['age_min'] || '18');
  const ageMax = parseInt(row['edad_max'] || row['age_max'] || '65');
  const headline = row['titulo'] || row['headline'] || name;
  const primaryText = row['texto'] || row['primary_text'] || `Descubre ${name}`;
  const description = row['descripcion'] || row['description'] || '';
  const cta = row['cta'] || row['call_to_action'] || 'LEARN_MORE';
  const url = row['url'] || row['destination_url'] || '';

  return {
    strategy: {
      rationale: 'Importado desde CSV',
      objective,
      estimated_results: {
        daily_reach_min: 1000,
        daily_reach_max: 5000,
        daily_clicks_min: 50,
        daily_clicks_max: 200,
        estimated_cpa_min: 0.5,
        estimated_cpa_max: 5.0,
        estimated_ctr: 1.5,
      },
      optimization_tips: [],
    },
    campaign: {
      name,
      objective,
      special_ad_categories: [],
      daily_budget: dailyBudget,
    },
    ad_sets: [{
      name: `Audiencia - ${name}`,
      targeting: {
        age_min: ageMin,
        age_max: ageMax,
        genders: [0],
        geo_locations: { countries },
      },
      placements: ['feed', 'stories', 'reels'],
      budget_percentage: 100,
      optimization_goal: 'LINK_CLICKS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    }],
    ads: [{
      name: `Anuncio - ${name}`,
      format: 'single_image',
      primary_text: primaryText,
      headline,
      description,
      call_to_action: cta,
      destination_url: url || undefined,
    }],
  };
}

export function generateCSVTemplate(): string {
  const headers = [
    'nombre', 'objetivo', 'presupuesto_diario', 'paises', 'edad_min',
    'edad_max', 'titulo', 'texto', 'descripcion', 'cta', 'url',
  ];

  const exampleRow = [
    'Mi Campaña', 'OUTCOME_TRAFFIC', '15', 'MX;CO', '25',
    '45', 'Descubre lo mejor', 'Conoce nuestros productos', 'Envío gratis', 'SHOP_NOW', 'https://ejemplo.com',
  ];

  return [headers.join(','), exampleRow.join(',')].join('\n');
}

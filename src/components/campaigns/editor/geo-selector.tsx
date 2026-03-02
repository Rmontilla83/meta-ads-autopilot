'use client';

import { useState, useRef, useCallback } from 'react';
import { Check, ChevronsUpDown, Search, X, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import type { GeoLocation } from '@/lib/meta/client';

interface GeoLocations {
  countries?: string[];
  cities?: Array<{ key: string; name: string }>;
  regions?: Array<{ key: string; name: string }>;
}

interface GeoSelectorProps {
  value: GeoLocations;
  onChange: (geo: GeoLocations) => void;
}

const LATAM_COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DO', name: 'Rep. Dominicana' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'MX', name: 'México' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perú' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'ES', name: 'España' },
];

export function GeoSelector({ value, onChange }: GeoSelectorProps) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState('');

  // City search
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<GeoLocation[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const cityCacheRef = useRef<Map<string, GeoLocation[]>>(new Map());
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedCountries = value.countries || [];
  const selectedCities = value.cities || [];

  // Search cities with debounce
  const searchCities = useCallback((query: string) => {
    if (cityDebounceRef.current) {
      clearTimeout(cityDebounceRef.current);
    }

    if (!query.trim() || selectedCountries.length === 0) {
      setCityResults([]);
      return;
    }

    cityDebounceRef.current = setTimeout(async () => {
      const countryCode = selectedCountries[0];
      const cacheKey = `${countryCode}:${query}`;

      if (cityCacheRef.current.has(cacheKey)) {
        setCityResults(cityCacheRef.current.get(cacheKey)!);
        return;
      }

      setLoadingCities(true);
      try {
        const url = `/api/meta/geo-search?type=city&country_code=${countryCode}&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const cities: GeoLocation[] = json.data || [];
          cityCacheRef.current.set(cacheKey, cities);
          setCityResults(cities);
        }
      } catch {
        toast.error('Error al buscar ciudades');
      } finally {
        setLoadingCities(false);
      }
    }, 300);
  }, [selectedCountries]);

  // Toggle country selection
  const toggleCountry = (code: string) => {
    const isSelected = selectedCountries.includes(code);

    if (isSelected) {
      const newCountries = selectedCountries.filter(c => c !== code);
      // Remove cities that belong to this country
      const newCities = selectedCities.filter(c => {
        const cityData = Array.from(cityCacheRef.current.values()).flat().find(cc => cc.key === c.key);
        return cityData ? cityData.country_code !== code : true;
      });
      onChange({ countries: newCountries, cities: newCities.length > 0 ? newCities : undefined });
    } else {
      onChange({ ...value, countries: [...selectedCountries, code] });
    }
  };

  // Add city
  const addCity = (city: GeoLocation) => {
    if (selectedCities.some(c => c.key === city.key)) return;
    onChange({ ...value, cities: [...selectedCities, { key: city.key, name: city.name }] });
    setCityQuery('');
    setCityResults([]);
  };

  // Remove city
  const removeCity = (key: string) => {
    const newCities = selectedCities.filter(c => c.key !== key);
    onChange({ ...value, cities: newCities.length > 0 ? newCities : undefined });
  };

  const filteredCountries = countryFilter
    ? LATAM_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countryFilter.toLowerCase()) ||
        c.code.toLowerCase().includes(countryFilter.toLowerCase())
      )
    : LATAM_COUNTRIES;

  const getCountryName = (code: string) =>
    LATAM_COUNTRIES.find(c => c.code === code)?.name || code;

  return (
    <div className="space-y-4">
      {/* Countries */}
      <div className="space-y-2">
        <Label>Países</Label>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal h-auto min-h-9 py-1.5">
              {selectedCountries.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedCountries.map(code => (
                    <Badge key={code} variant="secondary" className="text-xs">
                      {getCountryName(code)}
                      <button
                        className="ml-1 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); toggleCountry(code); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Seleccionar países...</span>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-2 border-b">
              <div className="flex items-center gap-2 px-1">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Buscar país..."
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto p-1">
              {filteredCountries.map(country => {
                const checked = selectedCountries.includes(country.code);
                return (
                  <button
                    key={country.code}
                    className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                    onClick={() => toggleCountry(country.code)}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <span>{country.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{country.code}</span>
                  </button>
                );
              })}
              {filteredCountries.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No se encontraron países</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Cities */}
      <div className="space-y-2">
        <Label>Ciudades</Label>
        {selectedCities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedCities.map(city => (
              <Badge key={city.key} variant="secondary" className="text-xs">
                {city.name}
                <button
                  className="ml-1 hover:text-destructive"
                  onClick={() => removeCity(city.key)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={selectedCountries.length === 0 ? 'Selecciona un país primero' : 'Buscar ciudad...'}
            disabled={selectedCountries.length === 0}
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              searchCities(e.target.value);
            }}
          />
          {loadingCities && (
            <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {cityResults.length > 0 && (
          <div className="border rounded-md max-h-48 overflow-y-auto">
            {cityResults.map(city => {
              const alreadySelected = selectedCities.some(c => c.key === city.key);
              return (
                <button
                  key={city.key}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent cursor-pointer disabled:opacity-50"
                  onClick={() => addCity(city)}
                  disabled={alreadySelected}
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{city.name}</span>
                  {city.region && (
                    <span className="text-xs text-muted-foreground">({city.region})</span>
                  )}
                  {alreadySelected && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Busca ciudades específicas para segmentar</p>
      </div>
    </div>
  );
}

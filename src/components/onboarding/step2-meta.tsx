'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MetaConnectionStatus } from '@/components/meta/meta-connection-status';
import { AlertTriangle, ArrowLeft, ArrowRight, Link2, Loader2, SkipForward } from 'lucide-react';
import type { MetaAdAccount, MetaPage, MetaPixel, MetaConnection } from '@/types';

interface Step2Props {
  connection: MetaConnection | null;
  metaError?: string | null;
  onNext: (data: {
    ad_account_id: string;
    ad_account_name: string;
    page_id: string;
    page_name: string;
    pixel_id: string;
    pixel_name: string;
  }) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function Step2Meta({ connection, metaError, onNext, onSkip, onBack }: Step2Props) {
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [selectedPixel, setSelectedPixel] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingPixels, setLoadingPixels] = useState(false);

  const isConnected = connection?.is_active;

  useEffect(() => {
    if (isConnected) {
      fetchAdAccounts();
      fetchPages();
    }
  }, [isConnected]);

  useEffect(() => {
    if (selectedAccount) {
      fetchPixels(selectedAccount);
    }
  }, [selectedAccount]);

  // Pre-select if connection already has selections
  useEffect(() => {
    if (connection) {
      if (connection.ad_account_id) setSelectedAccount(connection.ad_account_id);
      if (connection.page_id) setSelectedPage(connection.page_id);
      if (connection.pixel_id) setSelectedPixel(connection.pixel_id);
    }
  }, [connection]);

  const fetchAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch('/api/meta/ad-accounts');
      if (res.ok) {
        const data = await res.json();
        setAdAccounts(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching ad accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchPages = async () => {
    setLoadingPages(true);
    try {
      const res = await fetch('/api/meta/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching pages:', err);
    } finally {
      setLoadingPages(false);
    }
  };

  const fetchPixels = async (accountId: string) => {
    setLoadingPixels(true);
    try {
      const res = await fetch(`/api/meta/pixels?ad_account_id=${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setPixels(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching pixels:', err);
    } finally {
      setLoadingPixels(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/auth/meta/connect';
  };

  const handleNext = () => {
    const account = adAccounts.find((a) => a.id === selectedAccount);
    const page = pages.find((p) => p.id === selectedPage);
    const pixel = pixels.find((p) => p.id === selectedPixel);

    onNext({
      ad_account_id: selectedAccount,
      ad_account_name: account?.name || '',
      page_id: selectedPage,
      page_name: page?.name || '',
      pixel_id: selectedPixel || '',
      pixel_name: pixel?.name || '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Link2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Conecta Meta</h2>
        <p className="text-muted-foreground">
          Vincula tu cuenta de Meta Business para gestionar tus campañas.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-medium">Estado de conexión</span>
            <MetaConnectionStatus connection={connection} />
          </div>

          {metaError && (
            <div className="flex items-start gap-3 bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>No se pudo conectar con Meta. Intenta de nuevo o salta este paso.</p>
            </div>
          )}

          {!isConnected ? (
            <Button onClick={handleConnect} className="w-full" size="lg">
              <Link2 className="mr-2 h-5 w-5" />
              Conectar con Meta
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cuenta publicitaria *</Label>
                {loadingAccounts ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas...
                  </div>
                ) : (
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {adAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Página de Facebook *</Label>
                {loadingPages ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando páginas...
                  </div>
                ) : (
                  <Select value={selectedPage} onValueChange={setSelectedPage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una página" />
                    </SelectTrigger>
                    <SelectContent>
                      {pages.map((page) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Píxel de Meta (opcional)</Label>
                {loadingPixels ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando píxeles...
                  </div>
                ) : (
                  <Select value={selectedPixel} onValueChange={setSelectedPixel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un píxel" />
                    </SelectTrigger>
                    <SelectContent>
                      {pixels.map((pixel) => (
                        <SelectItem key={pixel.id} value={pixel.id}>
                          {pixel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
        </Button>
        {isConnected && selectedAccount && selectedPage ? (
          <Button onClick={handleNext} className="flex-1">
            Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="secondary" onClick={onSkip} className="flex-1">
            Saltar por ahora <SkipForward className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

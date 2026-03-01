'use client';

import { useUser } from '@/hooks/useUser';
import { useMetaConnection } from '@/hooks/useMetaConnection';
import { MetaConnectionStatus } from '@/components/meta/meta-connection-status';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Link2, Unlink, RefreshCw } from 'lucide-react';

export default function MetaConnectionPage() {
  const { metaConnection, loading, refresh } = useUser();
  const { connect, disconnect, disconnecting } = useMetaConnection(metaConnection, refresh);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conexión Meta</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu conexión con Meta Business.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estado de la Conexión</CardTitle>
              <CardDescription>
                Conecta tu cuenta de Meta para gestionar campañas publicitarias.
              </CardDescription>
            </div>
            <MetaConnectionStatus connection={metaConnection} loading={loading} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {metaConnection?.is_active ? (
            <>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cuenta publicitaria</span>
                  <span className="font-medium">{metaConnection.ad_account_name || 'No seleccionada'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Página de Facebook</span>
                  <span className="font-medium">{metaConnection.page_name || 'No seleccionada'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Píxel</span>
                  <span className="font-medium">{metaConnection.pixel_name || 'No seleccionado'}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => fetch('/api/auth/meta/refresh', { method: 'POST' })}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refrescar Token
                </Button>
                <Button variant="destructive" size="sm" onClick={disconnect} disabled={disconnecting}>
                  <Unlink className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={connect}>
              <Link2 className="h-4 w-4 mr-2" />
              Conectar con Meta
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

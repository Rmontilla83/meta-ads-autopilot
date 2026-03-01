'use client';

import { useUser } from '@/hooks/useUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Megaphone, DollarSign, TrendingUp, Link2 } from 'lucide-react';

export default function DashboardPage() {
  const { profile, businessProfile, metaConnection, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          ¡Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Aquí tienes un resumen de tus campañas de Meta Ads.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Campañas Activas</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">de {metaConnection ? 'tus campañas' : 'conecta Meta'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inversión del Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">USD este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Impresiones</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">últimos 30 días</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CTR Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">click-through rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Banner if Meta not connected */}
      {!metaConnection && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Conecta tu cuenta de Meta para crear campañas</CardTitle>
                <CardDescription className="mt-1">
                  Vincula tu cuenta de Meta Business para ver métricas, gestionar campañas y recibir sugerencias de IA.
                </CardDescription>
              </div>
              <Button onClick={() => window.location.href = '/api/auth/meta/connect'} className="shrink-0">
                <Link2 className="mr-2 h-4 w-4" />
                Conectar Meta
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

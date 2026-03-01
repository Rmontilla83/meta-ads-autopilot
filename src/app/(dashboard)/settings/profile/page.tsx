'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu información personal.
        </p>
      </div>
      <Card>
        <CardHeader className="text-center py-12">
          <div className="flex justify-center mb-4">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            La edición de perfil estará disponible pronto.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Facturación</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu plan y método de pago.
        </p>
      </div>
      <Card>
        <CardHeader className="text-center py-12">
          <div className="flex justify-center mb-4">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            La facturación estará disponible cuando se integre Stripe.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

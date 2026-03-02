import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <FileQuestion className="h-20 w-20 text-muted-foreground mb-6" />
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-2">Página no encontrada</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        La página que buscas no existe o ha sido movida.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Ir al inicio
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ver campañas
          </Link>
        </Button>
      </div>
    </div>
  );
}

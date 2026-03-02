'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, BookOpen, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-64">
        <nav className="flex flex-col gap-4 mt-8">
          <a
            href="#features"
            onClick={() => setOpen(false)}
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Funciones
          </a>
          <a
            href="#pricing"
            onClick={() => setOpen(false)}
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Precios
          </a>
          <a
            href="#testimonials"
            onClick={() => setOpen(false)}
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Testimonios
          </a>
          <Link
            href="/campaigns/new?express=true"
            onClick={() => setOpen(false)}
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Campaign Express
            <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-600 border-amber-500/30">
              Nuevo
            </Badge>
          </Link>
          <Link
            href="/guia"
            onClick={() => setOpen(false)}
            className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Guía
          </Link>
          <div className="border-t pt-4 mt-2 flex flex-col gap-3">
            <Link href="/login" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full">Iniciar Sesión</Button>
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <Button className="w-full">Empezar Gratis</Button>
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

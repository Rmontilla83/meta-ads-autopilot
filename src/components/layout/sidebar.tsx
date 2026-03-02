'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Brain,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  User,
  CreditCard,
  Bot,
  List,
  FlaskConical,
  Filter,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Copy,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  pro?: boolean;
  children?: { title: string; href: string; icon: React.ReactNode; pro?: boolean }[];
}

const sidebarItems: SidebarItem[] = [
  {
    title: 'Inicio',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Campañas',
    href: '/campaigns',
    icon: <Megaphone className="h-5 w-5" />,
    children: [
      {
        title: 'Todas las campañas',
        href: '/campaigns',
        icon: <List className="h-4 w-4" />,
      },
      {
        title: 'Crear con IA',
        href: '/campaigns/new',
        icon: <Sparkles className="h-4 w-4" />,
      },
      {
        title: 'Creación masiva',
        href: '/campaigns/bulk-create',
        icon: <Copy className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Optimización',
    href: '/analytics',
    icon: <Brain className="h-5 w-5" />,
    children: [
      {
        title: 'Análisis IA',
        href: '/analytics',
        icon: <Brain className="h-4 w-4" />,
      },
      {
        title: 'Pruebas A/B',
        href: '/ab-tests',
        icon: <FlaskConical className="h-4 w-4" />,
        pro: true,
      },
      {
        title: 'Embudos',
        href: '/campaigns/funnel-builder',
        icon: <Filter className="h-4 w-4" />,
        pro: true,
      },
      {
        title: 'Retargeting',
        href: '/campaigns/retargeting',
        icon: <RefreshCw className="h-4 w-4" />,
        pro: true,
      },
      {
        title: 'Escalado',
        href: '/scaling',
        icon: <TrendingUp className="h-4 w-4" />,
        pro: true,
      },
      {
        title: 'Automatización',
        href: '/settings/automation-rules',
        icon: <Bot className="h-4 w-4" />,
        pro: true,
      },
    ],
  },
  {
    title: 'Configuración',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
    children: [
      {
        title: 'Mi negocio',
        href: '/settings/profile',
        icon: <User className="h-4 w-4" />,
      },
      {
        title: 'Facturación',
        href: '/settings/billing',
        icon: <CreditCard className="h-4 w-4" />,
      },
    ],
  },
];

export function SidebarContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Campañas', 'Optimización']);
  const pathname = usePathname();

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2">
      <ul className="space-y-1">
        {sidebarItems.map((item) => (
          <li key={item.title}>
            {item.children ? (
              <>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.children[0].href}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center justify-center rounded-md p-2 hover:bg-sidebar-accent',
                          isActive(item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                        )}
                      >
                        {item.icon}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <button
                      onClick={() => toggleExpand(item.title)}
                      className={cn(
                        'flex items-center w-full rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent transition-colors',
                        isActive(item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                      )}
                    >
                      {item.icon}
                      <span className="ml-3 flex-1 text-left">{item.title}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          expandedItems.includes(item.title) && 'rotate-180'
                        )}
                      />
                    </button>
                    {expandedItems.includes(item.title) && (
                      <ul className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onNavigate}
                              className={cn(
                                'flex items-center rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors',
                                isActive(child.href) &&
                                  'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                              )}
                            >
                              {child.icon}
                              <span className="ml-3 flex-1">{child.title}</span>
                              {child.pro && (
                                <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
                                  <Lock className="h-2.5 w-2.5 mr-0.5" />
                                  PRO
                                </Badge>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </>
            ) : collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center justify-center rounded-md p-2 hover:bg-sidebar-accent transition-colors',
                      isActive(item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}
                  >
                    {item.icon}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent transition-colors',
                  isActive(item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
              >
                {item.icon}
                <span className="ml-3">{item.title}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 border-r bg-sidebar text-sidebar-foreground flex-col transition-all duration-300 hidden md:flex',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b">
        <Zap className="h-7 w-7 text-primary shrink-0" />
        {!collapsed && (
          <span className="font-bold text-lg truncate">MetaAds Autopilot</span>
        )}
      </div>

      <SidebarContent collapsed={collapsed} />

      {/* Collapse button */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Colapsar</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthGuard } from '@/components/layout/auth-guard';
import { ErrorBoundary } from '@/components/error-boundary';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { GuideBanner } from '@/components/layout/guide-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <TooltipProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Navbar />
            <main className="flex-1 p-4 md:p-6 lg:p-8">
              <GuideBanner />
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </AuthGuard>
  );
}

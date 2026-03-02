import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>

      {/* Form sections */}
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 mt-4" />
        </Card>
      ))}
    </div>
  );
}

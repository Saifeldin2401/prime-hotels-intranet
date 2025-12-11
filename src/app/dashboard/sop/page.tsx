import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { SOPDocumentStatus } from '@/lib/types/sop';
import { SOPStats } from './_components/sop-stats';
import { SOPDocumentsTable } from './_components/sop-documents-table';
import { SOPFilters } from './_components/sop-filters';
import { CreateSOPDialog } from './_components/create-sop-dialog';

export const metadata: Metadata = {
  title: 'SOP Management',
  description: 'Manage Standard Operating Procedures',
};

export default async function SOPDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const t = await getTranslations('sop.dashboard');

  // Extract filter params from URL
  const status = searchParams.status as SOPDocumentStatus | undefined;
  const departmentId = searchParams.department as string | undefined;
  const categoryId = searchParams.category as string | undefined;
  const query = searchParams.q as string | undefined;
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const pageSize = searchParams.pageSize ? Number(searchParams.pageSize) : 10;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <CreateSOPDialog>
          <Button>
            <Icons.plus className="mr-2 h-4 w-4" />
            {t('createSOP')}
          </Button>
        </CreateSOPDialog>
      </div>

      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <SOPStats />
      </Suspense>

      <Card>
        <CardHeader className="px-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>{t('documents')}</CardTitle>
            <SOPFilters 
              initialStatus={status}
              initialDepartmentId={departmentId}
              initialCategoryId={categoryId}
              initialQuery={query}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Suspense 
            fallback={
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            }
          >
            <SOPDocumentsTable 
              status={status}
              departmentId={departmentId}
              categoryId={categoryId}
              query={query}
              page={page}
              pageSize={pageSize}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { SOPService } from '@/lib/api/sop';
import { SOPEditor } from './_components/sop-editor';

export default async function SOPEditPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { data: document, error } = await SOPService.getDocumentById(params.id);

  if (error || !document) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <SOPEditor documentId={params.id} initialDocument={document} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SOPDocument } from '@/lib/types/sop';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface DocumentActionsProps {
  document: SOPDocument;
}

export function DocumentActions({ document }: DocumentActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: string) => {
    setIsLoading(true);
    try {
      // Implement action handlers
      switch (action) {
        case 'edit':
          router.push(`/dashboard/sop/${document.id}/edit`);
          break;
        case 'new-version':
          router.push(`/dashboard/sop/${document.id}/new-version`);
          break;
        case 'archive':
          // await SOPService.archiveDocument(document.id);
          toast({ title: 'Document archived' });
          router.refresh();
          break;
        case 'delete':
          // await SOPService.deleteDocument(document.id);
          toast({ title: 'Document deleted' });
          router.push('/dashboard/sop');
          break;
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex space-x-2">
      {document.status === 'draft' && (
        <Button 
          onClick={() => handleAction('edit')}
          disabled={isLoading}
        >
          <Icons.Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      )}
      
      <Button 
        variant="outline" 
        onClick={() => handleAction('new-version')}
        disabled={isLoading}
      >
        <Icons.PlusCircle className="h-4 w-4 mr-2" />
        New Version
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={isLoading}>
            <Icons.MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleAction('download')}>
            <Icons.Download className="h-4 w-4 mr-2" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction('print')}>
            <Icons.Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleAction('archive')}
            className="text-amber-600"
          >
            <Icons.Archive className="h-4 w-4 mr-2" />
            {document.archived_at ? 'Unarchive' : 'Archive'}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleAction('delete')}
            className="text-red-600"
          >
            <Icons.Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

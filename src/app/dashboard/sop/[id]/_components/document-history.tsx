'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface DocumentHistoryProps {
  documentId: string;
}

export function DocumentHistory({ documentId }: DocumentHistoryProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // In a real app, you would fetch this data
  // useEffect(() => {
  //   const fetchVersions = async () => {
  //     const { data } = await SOPService.getDocumentVersions(documentId);
  //     setVersions(data);
  //     setIsLoading(false);
  //   };
  //   fetchVersions();
  // }, [documentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Icons.Loader className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 p-4 flex justify-between items-center">
        <h2 className="text-lg font-medium">Version History</h2>
        <Button variant="outline" size="sm">
          <Icons.History className="h-4 w-4 mr-2" />
          View All
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Changes</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.length > 0 ? (
            versions.map((version) => (
              <TableRow key={version.id}>
                <TableCell className="font-medium">v{version.version_number}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {version.status}
                  </span>
                </TableCell>
                <TableCell>{version.creator?.full_name || 'System'}</TableCell>
                <TableCell>
                  {format(new Date(version.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {version.change_summary || 'No change description'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    <Icons.Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                <Icons.History className="h-12 w-12 mx-auto mb-2" />
                <p>No version history available</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

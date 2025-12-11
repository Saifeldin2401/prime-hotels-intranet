'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { SOPDocument } from '@/lib/types/sop';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface DocumentApprovalProps {
  document: SOPDocument;
}

export function DocumentApproval({ document }: DocumentApprovalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      // await SOPService.approveDocument(document.id, { comment });
      toast({
        title: 'Document approved',
        description: 'The document has been approved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast({
        title: 'Comment required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // await SOPService.rejectDocument(document.id, { comment });
      toast({
        title: 'Document rejected',
        description: 'The document has been sent back for revisions.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (document.status !== 'under_review') {
    return null;
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium mb-3">Approval Status</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            This document is pending your approval
          </p>
          
          <Textarea
            placeholder="Add a comment (required for rejection)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <div className="flex space-x-2">
          <Button 
            variant="default" 
            className="flex-1" 
            onClick={handleApprove}
            disabled={isLoading}
          >
            <Icons.Check className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={handleReject}
            disabled={isLoading || !comment.trim()}
          >
            <Icons.X className="h-4 w-4 mr-2" />
            Request Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

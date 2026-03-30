import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Mail, Trash2, AlertTriangle, Archive, UserCheck, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExportReviewsButton } from './ExportReviewsButton';

interface GuestReview {
  id: string;
  property_id?: string;
  reviewer_name?: string;
  review_title?: string;
  platform?: string;
  status?: string;
  [key: string]: unknown;
}

interface Filters {
  propertyId: string;
  platform: string;
  status: string;
  severity: string;
  sentiment: string;
  query: string;
}

interface BulkOperationsToolbarProps {
  reviews: GuestReview[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  propertyNameById: Map<string, string>;
  filters: Filters;
}

export function BulkOperationsToolbar({
  reviews,
  selectedIds,
  onSelectionChange,
  propertyNameById,
}: BulkOperationsToolbarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const allSelected = reviews.length > 0 && selectedIds.length === reviews.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < reviews.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(reviews.map((r) => r.id));
    }
  };

  // Simulate backend operations for demo
  const simulateMutation = (action: string, successMessage: string) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['guest-reviews'] });
        onSelectionChange([]);
        toast({
          title: action,
          description: successMessage,
        });
        resolve(selectedIds);
      }, 1000);
    });
  };

  // Bulk delete mutation (simulated)
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // In production: 
      // const { error } = await supabase.from('guest_reviews').delete().in('id', ids);
      // if (error) throw error;
      
      // For demo, simulate deletion
      return simulateMutation(
        'Reviews Deleted',
        `Successfully deleted ${ids.length} review(s).`
      );
    },
    onSuccess: (deletedIds) => {
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete reviews',
        variant: 'destructive',
      });
    },
  });

  // Bulk archive mutation (simulated)
  const archiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // In production:
      // const { error } = await supabase
      //   .from('guest_reviews')
      //   .update({ status: 'archived', updated_at: new Date().toISOString() })
      //   .in('id', ids);
      // if (error) throw error;
      
      return simulateMutation(
        'Reviews Archived',
        `Successfully archived ${ids.length} review(s).`
      );
    },
    onError: (error) => {
      toast({
        title: 'Archive Failed',
        description: error instanceof Error ? error.message : 'Failed to archive reviews',
        variant: 'destructive',
      });
    },
  });

  // Bulk mark as responded (simulated)
  const markRespondedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // In production:
      // const { error } = await supabase
      //   .from('guest_reviews')
      //   .update({ 
      //     status: 'responded', 
      //     responded_at: new Date().toISOString(),
      //     updated_at: new Date().toISOString() 
      //   })
      //   .in('id', ids);
      // if (error) throw error;
      
      return simulateMutation(
        'Marked as Responded',
        `Successfully marked ${ids.length} review(s) as responded.`
      );
    },
    onError: (error) => {
      toast({
        title: 'Action Failed',
        description: error instanceof Error ? error.message : 'Failed to update reviews',
        variant: 'destructive',
      });
    },
  });

  const selectedReviews = reviews.filter((r) => selectedIds.includes(r.id));

  const handleEmail = () => {
    // Generate email content with selected reviews
    const subject = `Guest Reviews Report - ${selectedIds.length} items`;
    const body = selectedReviews
      .map(
        (r) =>
          `• ${r.reviewer_name || 'Anonymous'} - ${propertyNameById.get(r.property_id || '') || r.property_id}\n  Platform: ${r.platform}\n  Status: ${r.status}`
      )
      .join('\n\n');
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    toast({
      title: 'Email Opened',
      description: 'Your default email client should open with review details.',
    });
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-muted-foreground/10">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) {
                (el as HTMLInputElement).indeterminate = someSelected;
              }
            }}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : `${reviews.length} reviews`}
          </span>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleEmail}
              title="Send email with review details"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
            
            <ExportReviewsButton 
              reviews={selectedReviews}
              propertyNameById={propertyNameById}
              variant="outline"
              size="sm"
              label="Export"
            />

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => markRespondedMutation.mutate(selectedIds)}
              disabled={markRespondedMutation.isPending}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Mark Responded
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => archiveMutation.mutate(selectedIds)}
              disabled={archiveMutation.isPending}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete {selectedIds.length} Review{selectedIds.length !== 1 ? 's' : ''}?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected reviews will be permanently removed from the database.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">Selected reviews:</p>
            <ul className="mt-2 space-y-1 text-sm max-h-[150px] overflow-auto">
              {selectedReviews.slice(0, 5).map((review) => (
                <li key={review.id} className="truncate">
                  • {review.reviewer_name || 'Anonymous'} - {review.review_title || 'No title'}
                </li>
              ))}
              {selectedReviews.length > 5 && (
                <li className="text-muted-foreground italic">
                  ...and {selectedReviews.length - 5} more
                </li>
              )}
            </ul>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(selectedIds)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

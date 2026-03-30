import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Mail, Trash2 } from 'lucide-react';

interface GuestReview {
  id: string;
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
}: BulkOperationsToolbarProps) {
  const allSelected = reviews.length > 0 && selectedIds.length === reviews.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < reviews.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(reviews.map((r) => r.id));
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-muted-foreground/10">
      <div className="flex items-center gap-4">
        <Checkbox
          checked={allSelected}
          ref={(el) => {
            if (el) {
              el.indeterminate = someSelected;
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
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

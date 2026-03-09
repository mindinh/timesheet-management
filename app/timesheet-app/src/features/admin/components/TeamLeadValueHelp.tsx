import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import type { ValueHelpComponentProps } from '@/shared/components/filterbar/types';
import { useValueHelpSelection } from '@/hooks/useValueHelpSelection';
import { fetchTimesheetBatches } from '@/features/admin/api/admin-api';

export interface TeamLeadItem {
  id: string;
  name: string;
}

export function TeamLeadValueHelp({ open, onClose, onSelect, selectedIds }: ValueHelpComponentProps<TeamLeadItem>) {
  const [items, setItems] = useState<TeamLeadItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { selection, isSelected, toggle, clearSelection, setSelection } = useValueHelpSelection<TeamLeadItem>({
    idKey: 'id',
    initialSelection: [],
  });

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open]);

  // Sync incoming selectedIds to selection once items are loaded
  useEffect(() => {
    if (items.length > 0) {
      const temp = items.filter((item) => selectedIds.includes(item.id));
      setSelection(temp);
    }
  }, [items, selectedIds, setSelection]);

  const loadItems = async () => {
    if (items.length > 0) return; // cache locally
    setIsLoading(true);
    try {
      const batches = await fetchTimesheetBatches();
      const uniqueLeads = new Map<string, TeamLeadItem>();
      batches.forEach((b) => {
        if (b.teamLead?.ID && !uniqueLeads.has(b.teamLead.ID)) {
          uniqueLeads.set(b.teamLead.ID, {
            id: b.teamLead.ID,
            name: `${b.teamLead.firstName} ${b.teamLead.lastName}`,
          });
        }
      });
      setItems(Array.from(uniqueLeads.values()));
    } catch (error) {
      console.error('Failed to load team leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    onSelect(selection);
    onClose();
  };

  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Team Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search team lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto border rounded-md">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No team leads found</div>
            ) : (
              <div className="divide-y">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer"
                    onClick={() => toggle(item)}
                  >
                    <Checkbox checked={isSelected(item)} onCheckedChange={() => toggle(item)} />
                    <div className="text-sm font-medium">{item.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between items-center w-full mt-2">
          <span className="text-sm text-muted-foreground ml-2">{selection.length} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

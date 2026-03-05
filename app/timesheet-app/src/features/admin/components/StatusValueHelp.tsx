import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import type { ValueHelpComponentProps } from '@/shared/components/filterbar/types';
import { useValueHelpSelection } from '@/hooks/useValueHelpSelection';

export interface StatusItem {
    id: string;
    name: string;
}

const STATUS_OPTIONS: StatusItem[] = [
    { id: 'Pending', name: 'Pending' },
    { id: 'Done', name: 'Done' },
    { id: 'Reopened', name: 'Reopened' },
];

export function StatusValueHelp({ open, onClose, onSelect, selectedIds }: ValueHelpComponentProps<StatusItem>) {
    const {
        selection,
        isSelected,
        toggle,
        clearSelection,
        setSelection,
    } = useValueHelpSelection<StatusItem>({
        idKey: 'id',
        initialSelection: []
    });

    // Sync incoming selectedIds to selection
    useEffect(() => {
        if (open) {
            const temp = STATUS_OPTIONS.filter(item => selectedIds.includes(item.id));
            setSelection(temp);
        }
    }, [open, selectedIds, setSelection]);

    const handleConfirm = () => {
        onSelect(selection);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Select Status</DialogTitle>
                </DialogHeader>
                <div className="py-2 space-y-1 my-2">
                    {STATUS_OPTIONS.map(item => (
                        <div
                            key={item.id}
                            className="flex items-center gap-3 py-2.5 px-3 hover:bg-muted cursor-pointer rounded-md border"
                            onClick={() => toggle(item)}
                        >
                            <Checkbox
                                checked={isSelected(item)}
                                onCheckedChange={() => toggle(item)}
                            />
                            <div className="text-sm font-medium">{item.name}</div>
                        </div>
                    ))}
                </div>
                <DialogFooter className="flex justify-between sm:justify-between items-center w-full mt-2">
                    <span className="text-sm text-muted-foreground ml-2">
                        {selection.length} selected
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
                        <Button size="sm" onClick={handleConfirm}>Confirm</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

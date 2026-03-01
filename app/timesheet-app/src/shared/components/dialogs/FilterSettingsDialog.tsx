import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Search, ChevronUp, ChevronsUp, ChevronDown, ChevronsDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';

export interface FilterSetting {
    key: string;
    label: string;
    visible: boolean;
}

interface FilterSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (filters: FilterSetting[]) => void;
    filters: FilterSetting[];
}

/**
 * Filter Settings Dialog.
 * Provides reorder + visibility controls for filter fields.
 */
export function FilterSettingsDialog({
    open,
    onClose,
    onApply,
    filters: initialFilters,
}: FilterSettingsDialogProps) {
    const [filters, setFilters] = useState<FilterSetting[]>(() =>
        initialFilters.map(col => ({ ...col }))
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [hideUnselected, setHideUnselected] = useState(false);

    // Reset state when dialog opens with new filters
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFilters(initialFilters.map(col => ({ ...col })));
            setSearchQuery('');
            setHideUnselected(false);
        }
    }, [open, initialFilters]);

    const filteredFilters = useMemo(() => {
        let filtered = filters;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(col => {
                return col.label.toLowerCase().includes(query) || col.key.toLowerCase().includes(query);
            });
        }

        if (hideUnselected) {
            filtered = filtered.filter(col => col.visible);
        }

        return filtered;
    }, [filters, searchQuery, hideUnselected]);

    const getFilterIndex = useCallback((key: string) => {
        return filters.findIndex(col => col.key === key);
    }, [filters]);

    const handleToggleVisibility = useCallback((key: string) => {
        setFilters(prev => prev.map(col =>
            col.key === key ? { ...col, visible: !col.visible } : col
        ));
    }, []);

    const handleMoveToTop = useCallback((key: string) => {
        setFilters(prev => {
            const index = prev.findIndex(col => col.key === key);
            if (index <= 0) return prev;
            const newFilters = [...prev];
            const [removed] = newFilters.splice(index, 1);
            newFilters.unshift(removed);
            return newFilters;
        });
    }, []);

    const handleMoveUp = useCallback((key: string) => {
        setFilters(prev => {
            const index = prev.findIndex(col => col.key === key);
            if (index <= 0) return prev;
            const newFilters = [...prev];
            [newFilters[index - 1], newFilters[index]] = [newFilters[index], newFilters[index - 1]];
            return newFilters;
        });
    }, []);

    const handleMoveDown = useCallback((key: string) => {
        setFilters(prev => {
            const index = prev.findIndex(col => col.key === key);
            if (index < 0 || index >= prev.length - 1) return prev;
            const newFilters = [...prev];
            [newFilters[index], newFilters[index + 1]] = [newFilters[index + 1], newFilters[index]];
            return newFilters;
        });
    }, []);

    const handleMoveToBottom = useCallback((key: string) => {
        setFilters(prev => {
            const index = prev.findIndex(col => col.key === key);
            if (index < 0 || index >= prev.length - 1) return prev;
            const newFilters = [...prev];
            const [removed] = newFilters.splice(index, 1);
            newFilters.push(removed);
            return newFilters;
        });
    }, []);

    const allSelected = useMemo(() => filters.every(col => col.visible), [filters]);
    const selectedCount = useMemo(() => filters.filter(col => col.visible).length, [filters]);

    const handleToggleAll = useCallback(() => {
        if (allSelected) {
            setFilters(prev => prev.map(col => ({ ...col, visible: false })));
        } else {
            setFilters(prev => prev.map(col => ({ ...col, visible: true })));
        }
    }, [allSelected]);

    const handleOk = useCallback(() => {
        onApply(filters);
        onClose();
    }, [filters, onApply, onClose]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent hideCloseButton className="sm:max-w-[500px] flex flex-col p-0 gap-0 overflow-hidden max-h-[80vh]">
                {/* Header */}
                <DialogHeader className="flex flex-row items-center justify-between p-6 border-b border-border flex-shrink-0 space-y-0 text-left">
                    <DialogTitle className="text-lg font-semibold text-foreground">Filter Settings</DialogTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHideUnselected(!hideUnselected)}
                        className="font-semibold text-primary hover:text-primary"
                    >
                        {hideUnselected ? 'Show all' : 'Hide unselected'}
                    </Button>
                </DialogHeader>

                {/* Search Bar */}
                <div className="px-6 pt-4 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search filters..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Content - Scrollable Table */}
                <div className="overflow-y-auto flex-1 pb-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                    <Table>
                        <TableHeader className="sticky top-0 bg-card z-10 shadow-sm border-b-0">
                            <TableRow>
                                <TableHead className="w-12 py-3 pl-6">
                                    <Checkbox
                                        checked={allSelected}
                                        onCheckedChange={handleToggleAll}
                                    />
                                </TableHead>
                                <TableHead className="py-3 font-semibold" colSpan={2}>
                                    Fields ({selectedCount}/{filters.length})
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredFilters.map((filter) => {
                                const originalIndex = getFilterIndex(filter.key);
                                const isFirst = originalIndex === 0;
                                const isLast = originalIndex === filters.length - 1;

                                return (
                                    <TableRow
                                        key={filter.key}
                                        className={filter.visible ? 'bg-primary/5' : ''}
                                    >
                                        <TableCell className="pl-6">
                                            <Checkbox
                                                checked={filter.visible}
                                                onCheckedChange={() => handleToggleVisibility(filter.key)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-sm ${filter.visible ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                {filter.label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="pr-6">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={() => handleMoveToTop(filter.key)}
                                                    disabled={isFirst}
                                                    title="Move to top"
                                                    className={`h-7 w-7 transition-colors ${isFirst
                                                        ? 'text-muted-foreground/30 cursor-not-allowed'
                                                        : 'text-destructive hover:text-destructive-foreground hover:bg-destructive'
                                                        }`}
                                                >
                                                    <ChevronsUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={() => handleMoveUp(filter.key)}
                                                    disabled={isFirst}
                                                    title="Move up"
                                                    className={`h-7 w-7 transition-colors ${isFirst
                                                        ? 'text-muted-foreground/30 cursor-not-allowed'
                                                        : 'text-destructive hover:text-destructive-foreground hover:bg-destructive'
                                                        }`}
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={() => handleMoveDown(filter.key)}
                                                    disabled={isLast}
                                                    title="Move down"
                                                    className={`h-7 w-7 transition-colors ${isLast
                                                        ? 'text-muted-foreground/30 cursor-not-allowed'
                                                        : 'text-destructive hover:text-destructive-foreground hover:bg-destructive'
                                                        }`}
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={() => handleMoveToBottom(filter.key)}
                                                    disabled={isLast}
                                                    title="Move to bottom"
                                                    className={`h-7 w-7 transition-colors ${isLast
                                                        ? 'text-muted-foreground/30 cursor-not-allowed'
                                                        : 'text-destructive hover:text-destructive-foreground hover:bg-destructive'
                                                        }`}
                                                >
                                                    <ChevronsDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {filteredFilters.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground">
                            No filters found matching your search.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="p-4 border-t border-border flex-shrink-0 bg-background sm:justify-end">
                    <Button
                        variant="default"
                        onClick={handleOk}
                        className="rounded-xl min-w-[80px]"
                    >
                        OK
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-xl min-w-[80px]"
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

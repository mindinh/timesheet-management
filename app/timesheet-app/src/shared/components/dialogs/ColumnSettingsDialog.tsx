import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Search, ChevronUp, ChevronsUp, ChevronDown, ChevronsDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';

export interface ColumnSetting {
    key: string;
    label: string;
    visible: boolean;
}

interface ColumnSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (columns: ColumnSetting[]) => void;
    columns: ColumnSetting[];
}

/**
 * Generic Column Settings Dialog.
 * Accepts column configuration and provides reorder + visibility controls.
 */
export function ColumnSettingsDialog({
    open,
    onClose,
    onApply,
    columns: initialColumns,
}: ColumnSettingsDialogProps) {
    const [columns, setColumns] = useState<ColumnSetting[]>(() =>
        initialColumns.map(col => ({ ...col }))
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [hideUnselected, setHideUnselected] = useState(false);

    // Reset state when dialog opens with new columns
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setColumns(initialColumns.map(col => ({ ...col })));
            setSearchQuery('');
            setHideUnselected(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialColumns]);

    const filteredColumns = useMemo(() => {
        let filtered = columns;

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
    }, [columns, searchQuery, hideUnselected]);

    const getColumnIndex = useCallback((key: string) => {
        return columns.findIndex(col => col.key === key);
    }, [columns]);

    const handleToggleVisibility = useCallback((key: string) => {
        setColumns(prev => prev.map(col =>
            col.key === key ? { ...col, visible: !col.visible } : col
        ));
    }, []);

    const handleMoveToTop = useCallback((key: string) => {
        setColumns(prev => {
            const index = prev.findIndex(col => col.key === key);
            if (index <= 0) return prev;
            const newColumns = [...prev];
            const [removed] = newColumns.splice(index, 1);
            newColumns.unshift(removed);
            return newColumns;
        });
    }, []);

    const handleMoveUp = useCallback((key: string) => {
        setColumns(prev => {
            const index = prev.findIndex(col => col.key === key);
            if (index <= 0) return prev;
            const newColumns = [...prev];
            [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
            return newColumns;
        });
    }, []);

    const handleMoveDown = useCallback((key: string) => {
        setColumns(prev => {
            const index = prev.findIndex(col => col.key === key);
            if (index < 0 || index >= prev.length - 1) return prev;
            const newColumns = [...prev];
            [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
            return newColumns;
        });
    }, []);

    const handleMoveToBottom = useCallback((key: string) => {
        setColumns(prev => {
            const index = prev.findIndex(col => col.key === key);
            if (index < 0 || index >= prev.length - 1) return prev;
            const newColumns = [...prev];
            const [removed] = newColumns.splice(index, 1);
            newColumns.push(removed);
            return newColumns;
        });
    }, []);

    const allSelected = useMemo(() => columns.every(col => col.visible), [columns]);
    const selectedCount = useMemo(() => columns.filter(col => col.visible).length, [columns]);

    const handleToggleAll = useCallback(() => {
        if (allSelected) {
            setColumns(prev => prev.map(col => ({ ...col, visible: false })));
        } else {
            setColumns(prev => prev.map(col => ({ ...col, visible: true })));
        }
    }, [allSelected]);

    const handleOk = useCallback(() => {
        onApply(columns);
        onClose();
    }, [columns, onApply, onClose]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent hideCloseButton className="sm:max-w-[500px] flex flex-col p-0 gap-0 overflow-hidden max-h-[80vh]">
                {/* Header */}
                <DialogHeader className="flex flex-row items-center justify-between p-6 border-b border-border flex-shrink-0 space-y-0 text-left">
                    <DialogTitle className="text-lg font-semibold text-foreground">Column Settings</DialogTitle>
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
                            placeholder="Search columns..."
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
                                    Fields ({selectedCount}/{columns.length})
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredColumns.map((column) => {
                                const originalIndex = getColumnIndex(column.key);
                                const isFirst = originalIndex === 0;
                                const isLast = originalIndex === columns.length - 1;

                                return (
                                    <TableRow
                                        key={column.key}
                                        className={column.visible ? 'bg-primary/5' : ''}
                                    >
                                        <TableCell className="pl-6">
                                            <Checkbox
                                                checked={column.visible}
                                                onCheckedChange={() => handleToggleVisibility(column.key)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-sm ${column.visible ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                {column.label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="pr-6">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={() => handleMoveToTop(column.key)}
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
                                                    onClick={() => handleMoveUp(column.key)}
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
                                                    onClick={() => handleMoveDown(column.key)}
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
                                                    onClick={() => handleMoveToBottom(column.key)}
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

                    {filteredColumns.length === 0 && (
                        <div className="py-8 text-center text-muted-foreground">
                            No columns found matching your search.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="p-4 border-t border-border flex-shrink-0 bg-background sm:justify-end">
                    <Button
                        variant="create"
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

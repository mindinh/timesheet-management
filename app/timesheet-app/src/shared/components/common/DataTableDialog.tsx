import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DataTable, type DataTableColumn, SelectedItemCard } from './';

/**
 * DataTableDialog Props
 *
 * Config-driven dialog for entity selection.
 * Visual layout follows the SAP Evaluation "Select: ___" pattern:
 *   Header → Search → Entity count → Table → Selected strip → Confirm/Cancel
 */
export interface DataTableDialogProps<T = any> {
    /** Whether the dialog is open */
    open: boolean;
    /** Handler to close the dialog */
    onOpenChange: (open: boolean) => void;
    /** Dialog title (e.g. "Select: Supplier") */
    title: string;
    /** Column definitions for the table */
    columns: DataTableColumn<T>[];
    /** Function to fetch data (returns promise with items) */
    fetchData: (searchTerm?: string) => Promise<T[]>;
    /** Function to search data (optional, if different from fetchData) */
    searchData?: (searchTerm: string) => Promise<T[]>;
    /** Function to get unique ID from a row */
    getRowId: (row: T) => string;
    /** Function to get display name for selected items (tokens) */
    getDisplayName?: (row: T) => string;
    /** Selection mode */
    selectionMode?: 'single' | 'multiple';
    /** Initially selected items */
    initialSelection?: T[];
    /** Handler called when selection is confirmed */
    onConfirm: (selectedItems: T[]) => void;
    /** Placeholder for search input */
    searchPlaceholder?: string;
    /** Label for confirm button (default: "Confirm") */
    confirmLabel?: string;
    /** Label for cancel button (default: "Cancel") */
    cancelLabel?: string;
    /** Show search bar (default: true) */
    showSearch?: boolean;
    /** Dialog width (default: responsive like Evaluation dialog) */
    width?: string;
    /**
     * Entity label shown in the count bar, e.g. "Suppliers" → "Suppliers (5)"
     * If omitted, falls back to the title.
     */
    entityLabel?: string;
}

export function DataTableDialog<T = any>({
    open,
    onOpenChange,
    title,
    columns,
    fetchData,
    searchData,
    getRowId,
    getDisplayName = (row) => getRowId(row),
    selectionMode = 'multiple',
    initialSelection = [],
    onConfirm,
    searchPlaceholder,
    confirmLabel,
    cancelLabel,
    showSearch = true,
    width = 'max-w-[95vw] w-[95vw] sm:max-w-[900px] sm:w-[900px] lg:max-w-[1000px] lg:w-[1000px]',
    entityLabel,
}: DataTableDialogProps<T>) {
    const { t } = useTranslation();
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(initialSelection.map(getRowId))
    );
    const [selectedItems, setSelectedItems] = useState<T[]>(initialSelection);

    // Fetch data when dialog opens
    useEffect(() => {
        if (open) {
            loadData();
            // Reset selection to initial
            setSelectedIds(new Set(initialSelection.map(getRowId)));
            setSelectedItems(initialSelection);
            setSearchTerm('');
        }
    }, [open]);

    const loadData = useCallback(async (term?: string) => {
        setIsLoading(true);
        try {
            const fetchFn = term && searchData ? searchData : fetchData;
            const result = await fetchFn(term || '');
            setData(result);
        } catch (error) {
            console.error('Failed to fetch data for dialog:', error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [fetchData, searchData]);

    // Auto-search on term change (debounced)
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            loadData(searchTerm.trim() || undefined);
        }, 250);
        return () => clearTimeout(timer);
    }, [searchTerm, open]);

    // Handle selection change — uses functional updater for selectedItems to avoid stale closure
    const handleSelectionChange = useCallback(
        (newSelectedIds: Set<string>) => {
            setSelectedIds(newSelectedIds);
            setSelectedItems((prev) => {
                const newSelectedItems = data.filter((item) =>
                    newSelectedIds.has(getRowId(item))
                );
                // Keep items from previous pages that are still selected but not in current data
                const previousSelected = prev.filter(
                    (item) => newSelectedIds.has(getRowId(item)) && !data.some((d) => getRowId(d) === getRowId(item))
                );
                return [...previousSelected, ...newSelectedItems];
            });
        },
        [data, getRowId]
    );

    // Remove a selected item
    const handleRemoveSelected = useCallback(
        (id: string) => {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            setSelectedItems((prev) => prev.filter((item) => getRowId(item) !== id));
        },
        [getRowId]
    );

    // Clear all selected
    const handleClearAll = useCallback(() => {
        setSelectedIds(new Set());
        setSelectedItems([]);
    }, []);

    // Confirm selection
    const handleConfirm = useCallback(() => {
        onConfirm(selectedItems);
        onOpenChange(false);
    }, [selectedItems, onConfirm, onOpenChange]);

    // Cancel
    const handleCancel = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    // Derive the entity count label
    const countLabel = useMemo(() => {
        const label = entityLabel || title.replace(/^Select:\s*/i, '').trim() || t('common.items', 'Items');
        return `${label} (${data.length})`;
    }, [entityLabel, title, data.length, t]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`${width} h-[85vh] flex flex-col p-0`}>
                {/* ── Header ─────────────────────────────── */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                    <DialogTitle className="text-lg">{title}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* ── Search Bar ────────────────────────── */}
                    {showSearch && (
                        <div className="px-6 pt-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    className="pl-10"
                                    placeholder={searchPlaceholder || t('common.search', 'Search')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Entity Count Bar ──────────────────── */}
                    <div className="px-6 py-2">
                        <span className="text-sm font-semibold text-foreground">
                            {isLoading ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    {t('common.loading', 'Loading…')}
                                </span>
                            ) : (
                                countLabel
                            )}
                        </span>
                    </div>

                    {/* ── Data Table ────────────────────────── */}
                    <div className="flex-1 relative px-6">
                        <div className="absolute inset-0 overflow-auto">
                            <DataTable
                                data={data}
                                columns={columns}
                                isLoading={isLoading}
                                selection={{
                                    enabled: true,
                                    mode: selectionMode,
                                    selectedIds,
                                    onSelectionChange: handleSelectionChange,
                                    getRowId,
                                }}
                                onRowClick={(row) => {
                                    const id = getRowId(row);
                                    if (selectionMode === 'single') {
                                        handleSelectionChange(new Set<string>([id]));
                                    } else {
                                        const newIds = new Set(selectedIds);
                                        if (newIds.has(id)) newIds.delete(id);
                                        else newIds.add(id);
                                        handleSelectionChange(newIds);
                                    }
                                }}
                                showFooter={false}
                                emptyMessageKey="common.noResults"
                                className="border-0 shadow-none rounded-none"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Selected Items (using SelectedItemCard like Evaluation dialog) ── */}
                <SelectedItemCard
                    items={selectedItems}
                    getItemId={(item) => getRowId(item)}
                    getItemLabel={(item) => {
                        const display = getDisplayName(item);
                        const dashIdx = display.indexOf(' - ');
                        if (dashIdx > -1) {
                            return {
                                primary: display.substring(0, dashIdx),
                                secondary: display.substring(dashIdx + 3),
                            };
                        }
                        return { primary: display };
                    }}
                    onRemove={handleRemoveSelected}
                    onClearAll={handleClearAll}
                />

                {/* ── Footer ─────────────────────────────── */}
                <DialogFooter className="px-6 py-4 border-t border-border flex justify-end gap-2">
                    <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
                        {confirmLabel || t('common.confirm', 'Confirm')} ({selectedIds.size})
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                        {cancelLabel || t('common.cancel', 'Cancel')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default DataTableDialog;

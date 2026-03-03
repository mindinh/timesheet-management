import { useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
} from '@/shared/components/ui/pagination';
import { ResizableTableHeader, useColumnWidths } from '@/shared/components/ui/ResizableTableHeader';
import { format as formatFns } from 'date-fns';

/**
 * Generic Column Definition for DataTable
 */
export interface DataTableColumn<T = any> {
    /** Unique key for the column (field name in data) */
    key: string;
    /** Translation key for header label */
    labelKey: string;
    /** Column width in pixels (optional, default: 150) */
    width?: number;
    /** Minimum column width in pixels (optional, default: 80) */
    minWidth?: number;
    /** Maximum column width in pixels (optional, for text wrapping) */
    maxWidth?: number;
    /** Whether this column is visible (default: true) */
    visible?: boolean;
    /** Render type for special formatting */
    renderType?: 'text' | 'link' | 'badge' | 'status' | 'date' | 'number' | 'duration' | 'custom';
    /** CSS classes for styling */
    className?: string;
    /** Custom render function (when renderType is 'custom') */
    render?: (value: unknown, row: T) => React.ReactNode;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
    page: number;
    pageSize: number;
    totalCount?: number | null;
    hasNextPage?: boolean;
    onPageChange: (page: number) => void;
}

/**
 * Selection configuration
 */
export interface SelectionConfig {
    enabled?: boolean;
    mode?: 'single' | 'multiple';
    selectedIds: Set<string>;
    onSelectionChange: (selectedIds: Set<string>) => void;
    getRowId: (row: unknown) => string;
}

/**
 * DataTable Props
 */
export interface DataTableProps<T = any> {
    /** Data items to display */
    data: T[];
    /** Column definitions */
    columns: DataTableColumn<T>[];
    /** Loading state */
    isLoading?: boolean;
    /** Placeholder data state (for optimistic updates) */
    isPlaceholderData?: boolean;
    /** Error object */
    error?: Error | null;
    /** Pagination configuration (optional) */
    pagination?: PaginationConfig;
    /** Selection configuration (optional) */
    selection?: SelectionConfig;
    /** Row click handler (optional) */
    onRowClick?: (row: T) => void;
    /** Refresh handler (optional) */
    onRefresh?: () => void;
    /** Empty state message key */
    emptyMessageKey?: string;
    /** Error state message key */
    errorMessageKey?: string;
    /** Title to show above table (optional) */
    title?: string;
    /** Show footer with pagination (default: true) */
    showFooter?: boolean;
    /** Custom CSS class for container */
    className?: string;
    /** Scroll handler for infinite scroll (optional) */
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
    /** Maximum height for table with scroll (optional) */
    maxHeight?: string;
    /** Loading state for infinite scroll (optional) */
    isFetchingNextPage?: boolean;
    /** Variant: 'card' (boxed with border) or 'borderless' (flat, no container) */
    variant?: 'card' | 'borderless';
    /** Sticky header - header sticks to top when scrolling (for global scroll) */
    stickyHeader?: boolean;
    /** Sticky header offset - top position offset in pixels for sticky header (e.g., to position below other sticky elements) */
    stickyHeaderOffset?: number;
}

/**
 * Default cell renderer based on column renderType
 */
function DefaultCellRenderer<T>({
    column,
    value,
    row,
}: {
    column: DataTableColumn<T>;
    value: unknown;
    row: T;
}) {
    const formatDate = (dateString: string) => formatFns(new Date(dateString), 'MMM dd, yyyy');
    const { t } = useTranslation();

    // Custom render function takes precedence
    if (column.render) {
        return <>{column.render(value, row)}</>;
    }

    switch (column.renderType) {
        case 'link':
            return (
                <span className={column.className || 'text-primary font-medium'}>
                    {value as React.ReactNode}
                </span>
            );

        case 'badge':
            return (
                <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-sm font-medium rounded-full bg-secondary text-secondary-foreground">
                        {(value as React.ReactNode) || '-'}
                    </span>
                </div>
            );

        case 'status':
            // Expects row to have 'status' and 'statusDescription' fields
            const rowAny = row as any;
            return (
                <div className="flex flex-col gap-1">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-secondary text-secondary-foreground inline-flex items-center w-max uppercase">
                        {rowAny.status}
                    </span>
                    {rowAny.statusDescription && (
                        <span className="text-xs text-muted-foreground">{rowAny.statusDescription}</span>
                    )}
                </div>
            );

        case 'date':
            return (
                <span className={column.className}>
                    {value ? formatDate(value as string) : '-'}
                </span>
            );

        case 'number':
            return (
                <span className={column.className || 'text-sm text-foreground'}>
                    {(value as React.ReactNode) ?? 0}
                </span>
            );

        case 'duration':
            return (
                <span className={column.className || 'text-sm text-muted-foreground'}>
                    {value ? `${value} ${t('common.days', 'days')}` : '-'}
                </span>
            );

        case 'text':
        default:
            return (
                <span className={column.className}>
                    {(value as React.ReactNode) ?? '-'}
                </span>
            );
    }
}

/**
 * DataTable - A reusable, configurable table component
 *
 * Features:
 * - Configurable columns with multiple render types
 * - Resizable column headers
 * - Row selection (single or multiple)
 * - Pagination (using reusable UI components)
 * - Loading and error states
 * - Row click handling
 */
export function DataTable<T = any>({
    data,
    columns,
    isLoading = false,
    isPlaceholderData = false,
    error = null,
    pagination,
    selection,
    onRowClick,
    onRefresh,
    emptyMessageKey = 'common.noData',
    errorMessageKey = 'common.error',
    title,
    showFooter = true,
    className = '',
    onScroll,
    maxHeight,
    isFetchingNextPage = false,
    variant = 'card',
    stickyHeader = false,
    stickyHeaderOffset = 0,
}: DataTableProps<T>) {
    const { t } = useTranslation();

    // Filter to visible columns only
    const visibleColumns = useMemo(
        () => columns.filter((col) => col.visible !== false),
        [columns]
    );

    // Column widths for resizable headers
    const { columnWidths, handleWidthChange } = useColumnWidths(
        visibleColumns.map((col) => ({ key: col.key, width: col.width || 150 }))
    );

    // Sticky header refs and state
    const headerRef = useRef<HTMLTableSectionElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Selection handlers
    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (!selection) return;
            if (checked) {
                const allIds = new Set(data.map((row) => selection.getRowId(row)));
                selection.onSelectionChange(allIds);
            } else {
                selection.onSelectionChange(new Set());
            }
        },
        [data, selection]
    );

    const handleSelectRow = useCallback(
        (id: string, checked: boolean) => {
            if (!selection) return;

            if (selection.mode === 'single') {
                // Single selection mode - only one item selected at a time
                if (checked) {
                    selection.onSelectionChange(new Set([id]));
                } else {
                    selection.onSelectionChange(new Set());
                }
            } else {
                // Multiple selection mode
                const newSelected = new Set(selection.selectedIds);
                if (checked) {
                    newSelected.add(id);
                } else {
                    newSelected.delete(id);
                }
                selection.onSelectionChange(newSelected);
            }
        },
        [selection]
    );

    const handleRowClickInternal = useCallback(
        (row: T) => {
            if (onRowClick) {
                onRowClick(row);
            }
        },
        [onRowClick]
    );

    const showLoading = isLoading && !isPlaceholderData && data.length === 0;
    const showCheckboxColumn = selection?.enabled !== false && selection;

    // Pagination handlers
    const handlePrevPage = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            if (pagination && pagination.page > 1 && !isLoading) {
                pagination.onPageChange(pagination.page - 1);
            }
        },
        [pagination, isLoading]
    );

    const handleNextPage = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            if (pagination && pagination.hasNextPage && !isLoading) {
                pagination.onPageChange(pagination.page + 1);
            }
        },
        [pagination, isLoading]
    );

    // Borderless variant (for worklist pages with global scroll)
    if (variant === 'borderless') {
        return (
            <div className={`bg-card rounded-xl shadow-sm border-0 ${className}`}>
                {/* Title */}
                {title && (
                    <div className="py-3">
                        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    </div>
                )}

                {/* Table Content */}
                <div className="relative" ref={tableContainerRef}>
                    <Table>
                        <TableHeader
                            ref={headerRef}
                            className={stickyHeader ? 'sticky z-20 bg-muted shadow-sm' : 'bg-muted'}
                            style={stickyHeader ? { top: `${stickyHeaderOffset}px` } : undefined}
                        >
                            <TableRow className="bg-muted">
                                {showCheckboxColumn && (
                                    <TableHead className={`w-12 ${stickyHeader ? 'bg-muted' : ''}`}>
                                        {selection.mode !== 'single' && (
                                            <Checkbox
                                                checked={data.length > 0 && selection.selectedIds.size === data.length}
                                                onCheckedChange={handleSelectAll}
                                                aria-label={t('common.selectAll', 'Select all')}
                                            />
                                        )}
                                    </TableHead>
                                )}
                                {visibleColumns.map((column) => (
                                    <ResizableTableHeader
                                        key={column.key}
                                        columnKey={column.key}
                                        initialWidth={column.width || 150}
                                        minWidth={column.minWidth || 80}
                                        onWidthChange={handleWidthChange}
                                        className={stickyHeader ? 'bg-muted' : ''}
                                    >
                                        {t(column.labelKey)}
                                    </ResizableTableHeader>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody className="relative">
                            {showLoading && (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length + (showCheckboxColumn ? 1 : 0)} className="h-64">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.length === 0 && !isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={visibleColumns.length + (showCheckboxColumn ? 1 : 0)}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        {error ? t(errorMessageKey) : t(emptyMessageKey)}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row) => {
                                    const rowId = selection?.getRowId(row) || '';
                                    const isSelected = selection?.selectedIds.has(rowId);

                                    return (
                                        <TableRow
                                            key={rowId}
                                            className={`hover:bg-muted transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-primary/5' : ''}`}
                                            onClick={() => handleRowClickInternal(row)}
                                            style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
                                        >
                                            {showCheckboxColumn && (
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) =>
                                                            handleSelectRow(rowId, checked as boolean)
                                                        }
                                                        aria-label={t('common.selectRow', { id: rowId })}
                                                    />
                                                </TableCell>
                                            )}
                                            {visibleColumns.map((column) => (
                                                <TableCell
                                                    key={column.key}
                                                    style={{
                                                        width: `${columnWidths[column.key]}px`,
                                                        minWidth: `${column.minWidth || 80}px`,
                                                        ...(column.maxWidth && { maxWidth: `${column.maxWidth}px` }),
                                                    }}
                                                    className="whitespace-normal break-words"
                                                >
                                                    <DefaultCellRenderer
                                                        column={column}
                                                        value={(row as any)[column.key]}
                                                        row={row}
                                                    />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Infinite scroll loading indicator */}
                    {isFetchingNextPage && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                    )}
                </div>

                {/* Footer - simplified for borderless */}
                {showFooter && onRefresh && (
                    <div className="py-3 flex items-center justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRefresh}
                            className="gap-1"
                            disabled={isLoading}
                        >
                            <RefreshCw className="w-4 h-4" />
                            {t('common.refresh', 'Refresh')}
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // Card variant (default - boxed with border)
    return (
        <div className={`bg-card rounded-xl shadow-sm border-2 border-border hover:border-[var(--color-primary)] transition-all overflow-hidden ${className}`}>
            {/* Title */}
            {title && (
                <div className="px-6 py-3 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                </div>
            )}

            {/* Table Content */}
            <div
                className="relative"
                style={{
                    ...(maxHeight && {
                        maxHeight,
                        overflowY: 'auto',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'hsl(var(--border)) transparent',
                    })
                }}
                onScroll={onScroll}
            >
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            {showCheckboxColumn && (
                                <TableHead className="w-12">
                                    {selection.mode !== 'single' && (
                                        <Checkbox
                                            checked={data.length > 0 && selection.selectedIds.size === data.length}
                                            onCheckedChange={handleSelectAll}
                                            aria-label={t('common.selectAll', 'Select all')}
                                        />
                                    )}
                                </TableHead>
                            )}
                            {visibleColumns.map((column) => (
                                <ResizableTableHeader
                                    key={column.key}
                                    columnKey={column.key}
                                    initialWidth={column.width || 150}
                                    minWidth={column.minWidth || 80}
                                    onWidthChange={handleWidthChange}
                                >
                                    {t(column.labelKey)}
                                </ResizableTableHeader>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody className="relative">
                        {showLoading && (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length + (showCheckboxColumn ? 1 : 0)} className="h-64">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {data.length === 0 && !isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={visibleColumns.length + (showCheckboxColumn ? 1 : 0)}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    {error ? t(errorMessageKey) : t(emptyMessageKey)}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row) => {
                                const rowId = selection?.getRowId(row) || '';
                                const isSelected = selection?.selectedIds.has(rowId);

                                return (
                                    <TableRow
                                        key={rowId}
                                        className={`hover:bg-muted transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-primary/5' : ''}`}
                                        onClick={() => handleRowClickInternal(row)}
                                        style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
                                    >
                                        {showCheckboxColumn && (
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectRow(rowId, checked as boolean)
                                                    }
                                                    aria-label={t('common.selectRow', { id: rowId })}
                                                />
                                            </TableCell>
                                        )}
                                        {visibleColumns.map((column) => (
                                            <TableCell
                                                key={column.key}
                                                style={{
                                                    width: `${columnWidths[column.key]}px`,
                                                    minWidth: `${column.minWidth || 80}px`,
                                                    ...(column.maxWidth && { maxWidth: `${column.maxWidth}px` }),
                                                }}
                                                className="whitespace-normal break-words"
                                            >
                                                <DefaultCellRenderer
                                                    column={column}
                                                    value={(row as any)[column.key]}
                                                    row={row}
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Infinite scroll loading indicator */}
                {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-4 bg-muted">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                )}
            </div>

            {/* Footer with Pagination - Using Reusable UI Components */}
            {showFooter && (pagination || onRefresh) && (
                <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-muted rounded-b-xl">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {onRefresh && (
                            <>
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                <span>
                                    {isLoading ? t('common.updating', 'Updating...') : t('common.lastUpdated', 'Last updated')}
                                </span>
                            </>
                        )}
                        {pagination?.totalCount != null && (
                            <span className="ml-2 font-medium">
                                ({pagination.totalCount} {t('common.items', 'items')})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {pagination && (
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={handlePrevPage}
                                            aria-disabled={pagination.page === 1 || isLoading}
                                            className={pagination.page === 1 || isLoading ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <span className="text-sm font-medium text-foreground px-3">
                                            {t('common.page', 'Page')} {pagination.page}
                                        </span>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={handleNextPage}
                                            aria-disabled={!pagination.hasNextPage || isLoading}
                                            className={!pagination.hasNextPage || isLoading ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                        {onRefresh && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefresh}
                                className="gap-1 ml-2"
                                disabled={isLoading}
                            >
                                <RefreshCw className="w-4 h-4" />
                                {t('common.refresh', 'Refresh')}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DataTable;

// FilterBar has been migrated to @/shared/components/filterbar

// Reusable table components — local copies (synced from reference)
export { DataTable, type DataTableColumn, type DataTableProps, type PaginationConfig, type SelectionConfig } from './DataTable';
export { DataTableDialog, type DataTableDialogProps } from './DataTableDialog';

export { FieldDisplay, type FieldDisplayProps } from './FieldDisplay';

// Re-export from UI layer (these are not duplicated locally)
export { ResizableTableHeader, useColumnWidths } from '../ui/ResizableTableHeader';
export { SelectedItemCard, type SelectedItemCardProps } from '../ui/SelectedItemCard';

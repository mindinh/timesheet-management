import { X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  mandatory?: boolean; // Cannot be hidden
}

interface ColumnVisibilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onApply: (columns: ColumnConfig[]) => void;
  title?: string;
}

export function ColumnVisibilityDialog({
  isOpen,
  onClose,
  columns,
  onApply,
  title = 'Table Settings',
}: ColumnVisibilityDialogProps) {
  if (!isOpen) return null;

  const handleToggle = (columnId: string) => {
    const updatedColumns = columns.map(col =>
      col.id === columnId && !col.mandatory
        ? { ...col, visible: !col.visible }
        : col
    );
    onApply(updatedColumns);
  };

  const handleSelectAll = () => {
    const updatedColumns = columns.map(col => ({ ...col, visible: true }));
    onApply(updatedColumns);
  };

  const handleDeselectAll = () => {
    const updatedColumns = columns.map(col =>
      col.mandatory ? col : { ...col, visible: false }
    );
    onApply(updatedColumns);
  };

  return (
    <div className="fixed inset-0 bg-foreground/10 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Column Visibility</h4>
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
              >
                Deselect All
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {columns.map((column) => (
              <label
                key={column.id}
                className={`flex items-center gap-2 p-2 rounded hover:bg-muted ${column.mandatory ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
              >
                <Checkbox
                  checked={column.visible}
                  onCheckedChange={() => handleToggle(column.id)}
                  disabled={column.mandatory}
                />
                <span className="text-sm text-muted-foreground">
                  {column.label}
                  {column.mandatory && (
                    <span className="ml-2 text-xs text-muted-foreground">(Required)</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

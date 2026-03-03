import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { buttonVariants } from '@/shared/components/ui/button';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    message?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmButtonText?: string;
    cancelButtonText?: string;
    variant?: 'default' | 'destructive';
}

/**
 * Reusable Confirmation Dialog Component
 *
 * Confirmation dialog with "Cancel" and "Confirm" buttons.
 * Can be styled as destructive for delete operations.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={deleteDialogOpen}
 *   onOpenChange={setDeleteDialogOpen}
 *   title="Confirm Delete"
 *   message={`Delete ${count} items?`}
 *   onConfirm={handleDelete}
 *   variant="destructive"
 * />
 * ```
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title = '',
    message = '',
    onConfirm,
    onCancel,
    confirmButtonText = 'Confirm',
    cancelButtonText = 'Cancel',
    variant = 'default',
}: ConfirmDialogProps) {
    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{message}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel}>
                        {cancelButtonText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className={variant === 'destructive' ? buttonVariants({ variant: 'destructive' }) : ''}
                    >
                        {confirmButtonText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

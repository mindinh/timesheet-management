import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';

interface ErrorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    message: string;
    closeButtonText?: string;
}

/**
 * Reusable Error Dialog Component
 *
 * Simple error dialog with a single "Close" button.
 *
 * @example
 * ```tsx
 * <ErrorDialog
 *   open={errorOpen}
 *   onOpenChange={setErrorOpen}
 *   message="Please select at least one row"
 * />
 * ```
 */
export function ErrorDialog({
    open,
    onOpenChange,
    title = 'Error',
    message,
    closeButtonText = 'Close',
}: ErrorDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{message}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => onOpenChange(false)}>
                        {closeButtonText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

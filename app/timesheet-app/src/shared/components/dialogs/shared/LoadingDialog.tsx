import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/shared/components/ui/progress';

interface LoadingDialogProps {
    open: boolean;
    title?: string;
    message?: string;
    progress?: number; // 0-100
    showProgress?: boolean;
}

/**
 * Loading Dialog Component
 * Shows a loading spinner with optional title and message, or a progress bar.
 */
export function LoadingDialog({
    open,
    title = 'Loading...',
    message,
    progress = 0,
    showProgress = false,
}: LoadingDialogProps) {
    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent
                aria-describedby={undefined}
                className="max-w-md"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-lg">
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-8 gap-4">
                    {showProgress ? (
                        <>
                            {message && (
                                <p className="text-sm text-muted-foreground text-center mb-2">
                                    {message}
                                </p>
                            )}
                            <div className="w-full px-4">
                                <Progress value={progress} className="h-3" />
                                <p className="text-xs text-muted-foreground text-center mt-2">
                                    {Math.round(progress)}%
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            {message && (
                                <p className="text-sm text-muted-foreground text-center">
                                    {message}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/shared/components/ui/dialog'
import { cn } from '@/shared/lib/utils'

type DialogVariant = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface StatusDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    variant: DialogVariant
    title: string
    description?: string
    /** Optional detail message shown in a highlighted box (e.g., error details) */
    detail?: string
    /** Label for the primary action button. Defaults vary by variant. */
    primaryLabel?: string
    /** Label for the secondary action button (e.g., "Cancel"). Hidden if omitted. */
    secondaryLabel?: string
    onPrimaryAction?: () => void
    onSecondaryAction?: () => void
    /** Whether the primary action button should use destructive styling */
    destructive?: boolean
}

const variantConfig: Record<DialogVariant, {
    icon: React.ElementType
    iconContainerClass: string
    iconClass: string
    defaultPrimaryLabel: string
}> = {
    success: {
        icon: CheckCircle2,
        iconContainerClass: 'bg-green-100',
        iconClass: 'text-green-600',
        defaultPrimaryLabel: 'Close',
    },
    error: {
        icon: XCircle,
        iconContainerClass: 'bg-red-100',
        iconClass: 'text-red-600',
        defaultPrimaryLabel: 'Try Again',
    },
    warning: {
        icon: AlertTriangle,
        iconContainerClass: 'bg-amber-100',
        iconClass: 'text-amber-600',
        defaultPrimaryLabel: 'Confirm',
    },
    info: {
        icon: Info,
        iconContainerClass: 'bg-blue-100',
        iconClass: 'text-blue-600',
        defaultPrimaryLabel: 'Understood',
    },
    loading: {
        icon: Loader2,
        iconContainerClass: 'bg-blue-100',
        iconClass: 'text-blue-600 animate-spin',
        defaultPrimaryLabel: '',
    },
}

export default function StatusDialog({
    open,
    onOpenChange,
    variant,
    title,
    description,
    detail,
    primaryLabel,
    secondaryLabel,
    onPrimaryAction,
    onSecondaryAction,
    destructive = false,
}: StatusDialogProps) {
    const config = variantConfig[variant]
    const Icon = config.icon
    const resolvedPrimaryLabel = primaryLabel ?? config.defaultPrimaryLabel

    const handlePrimary = () => {
        onPrimaryAction?.()
        onOpenChange(false)
    }

    const handleSecondary = () => {
        onSecondaryAction?.()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md text-center">
                <DialogHeader className="items-center gap-3">
                    <div className={cn(
                        'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
                        config.iconContainerClass
                    )}>
                        <Icon className={cn('h-6 w-6', config.iconClass)} />
                    </div>
                    <DialogTitle className="text-lg font-semibold">
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-sm text-muted-foreground">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                {detail && (
                    <div className="mx-4 rounded-md border-l-4 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-800 text-left">
                        {detail}
                    </div>
                )}

                {variant === 'loading' && (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                )}

                {variant !== 'loading' && (
                    <DialogFooter className="sm:justify-center gap-3 pt-2">
                        {secondaryLabel && (
                            <Button
                                variant="outline"
                                onClick={handleSecondary}
                                className="min-w-[100px]"
                            >
                                {secondaryLabel}
                            </Button>
                        )}
                        {resolvedPrimaryLabel && (
                            <Button
                                variant={destructive ? 'destructive' : 'default'}
                                onClick={handlePrimary}
                                className="min-w-[100px]"
                            >
                                {resolvedPrimaryLabel}
                            </Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

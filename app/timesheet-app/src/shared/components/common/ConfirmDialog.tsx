import StatusDialog from './StatusDialog'

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    /** Label for the confirm button. Defaults to "Confirm". */
    confirmLabel?: string
    /** Label for the cancel button. Defaults to "Cancel". */
    cancelLabel?: string
    onConfirm: () => void
    onCancel?: () => void
    /** Whether the confirm button should use destructive (red) styling. Defaults to true. */
    destructive?: boolean
}

export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    destructive = true,
}: ConfirmDialogProps) {
    return (
        <StatusDialog
            open={open}
            onOpenChange={onOpenChange}
            variant="warning"
            title={title}
            description={description}
            primaryLabel={confirmLabel}
            secondaryLabel={cancelLabel}
            onPrimaryAction={onConfirm}
            onSecondaryAction={onCancel}
            destructive={destructive}
        />
    )
}

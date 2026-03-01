/**
 * FieldDisplay — Simple label + value display for detail/preview views.
 *
 * Shared common component for read-only field rendering.
 * Used by: BidderQuotation detail sections, preview dialogs.
 */
import type { ReactNode } from 'react';

export interface FieldDisplayProps {
    label: string;
    /** Value to display — can be string, number, or JSX (e.g., StatusBadge) */
    value: ReactNode;
    /** Additional className for the container div */
    className?: string;
    /** Additional className for the value text only (e.g., `text-destructive` for urgency) */
    valueClassName?: string;
}

export function FieldDisplay({ label, value, className = '', valueClassName = '' }: FieldDisplayProps) {
    return (
        <div className={className}>
            <span className="text-sm font-bold">{label}</span>
            <p className={`text-muted-foreground ${valueClassName}`.trim()}>{value ?? '—'}</p>
        </div>
    );
}


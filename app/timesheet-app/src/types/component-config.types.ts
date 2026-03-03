import type { LucideIcon } from 'lucide-react';

/**
 * ActionItem — Configuration object for TableActionBar action buttons.
 * Used by the config-driven mode of TableActionBar.
 */
export interface ActionItem {
    /** Unique identifier for the action */
    id: string;
    /** i18n translation key for the label */
    labelKey?: string;
    /** Lucide icon component */
    icon?: LucideIcon;
    /** Click handler */
    onClick?: () => void;
    /** Button variant from design system */
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'create' | 'action' | 'filter';
    /** Button size */
    size?: 'default' | 'sm' | 'lg' | 'icon';
    /** Group identifier — triggers a visual divider between different groups */
    group?: string;
    /** Whether the action is disabled */
    disabled?: boolean;
    /** Show label text (false = icon-only) */
    showLabel?: boolean;
    /** Tooltip text (overrides labelKey translation) */
    title?: string;
    /** Additional CSS classes */
    className?: string;
    /** Custom render function (replaces default Button rendering) */
    render?: () => React.ReactNode;
}

/**
 * MenuItem — Configuration object for Sidebar navigation items.
 */
export interface MenuItem {
    id: string;
    label?: string;
    labelKey: string;
    icon: LucideIcon;
}

/**
 * FooterAction — Configuration object for FixedFooter action buttons.
 */
export interface FooterAction {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'create' | 'action';
    icon?: LucideIcon;
    disabled?: boolean;
    hidden?: boolean;
    loading?: boolean;
    loadingLabel?: string;
    className?: string;
}

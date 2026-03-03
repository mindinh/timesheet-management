/**
 * TableActionBar Component
 *
 * Config-driven action bar for tables — accepts an `actions: ActionItem[]` array.
 * Falls back to legacy individual handler props for backward compatibility.
 * Follows SAP Fiori table toolbar patterns.
 */
import { Plus, Trash2, Settings, Download, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import type { ActionItem } from '@/types/component-config.types';

export interface TableActionBarProps {
    /** Config-driven action items (preferred) */
    actions?: ActionItem[];
    /** Alignment of the toolbar buttons */
    align?: 'left' | 'right';

    // --- Legacy individual handler props (backward compat) ---
    createLabel?: string;
    onCreate?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    onExport?: () => void;
    onMore?: () => void;
    hideMore?: boolean;
    hasSelection?: boolean;
    createDisabled?: boolean;
}

export function TableActionBar({
    actions,
    align = 'right',
    // Legacy props
    createLabel = 'Create',
    onCreate,
    onDelete,
    onSettings,
    onExport,
    onMore,
    hideMore = false,
    hasSelection = false,
    createDisabled = false,
}: TableActionBarProps) {
    const { t } = useTranslation();

    // Config-driven mode
    if (actions && actions.length > 0) {
        let lastGroup: string | undefined = undefined;
        return (
            <div
                className={`flex flex-wrap items-center gap-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}
            >
                {actions.map((action) => {
                    const needsDivider = action.group !== undefined && lastGroup !== undefined && action.group !== lastGroup;
                    lastGroup = action.group;

                    if (action.render) {
                        return (
                            <div key={action.id} className="flex items-center">
                                {needsDivider && <div className="border-l border-border h-5 ml-2 mr-2" />}
                                {action.render()}
                            </div>
                        );
                    }

                    const Icon = action.icon;
                    const label = action.labelKey ? t(action.labelKey) : undefined;
                    return (
                        <div key={action.id} className="flex items-center">
                            {needsDivider && <div className="border-l border-border h-5 ml-0 mr-2" />}
                            <Button
                                variant={action.variant ?? 'ghost'}
                                size={action.size ?? 'icon'}
                                onClick={action.onClick}
                                disabled={action.disabled}
                                className={action.className ?? (action.size === 'icon' ? 'h-9 w-9' : 'gap-2')}
                                aria-label={label}
                                title={action.title ?? label}
                            >
                                {Icon && <Icon className={action.size === 'icon' ? 'h-4 w-4 text-primary' : 'w-4 h-4'} />}
                                {action.showLabel !== false && action.labelKey && action.size !== 'icon' && (
                                    <span>{label}</span>
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Legacy mode
    return (
        <div
            className={`flex items-center gap-2 py-2 ${align === 'right' ? 'justify-end' : 'justify-start'}`}
        >
            {onCreate && (
                <Button variant="outline" size="sm" onClick={onCreate} disabled={createDisabled} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    {createLabel}
                </Button>
            )}
            {onDelete && (
                <Button variant="outline" size="sm" onClick={onDelete} disabled={!hasSelection} className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                </Button>
            )}
            {onExport && (
                <Button variant="ghost" size="icon" onClick={onExport} className="h-8 w-8" aria-label="Export">
                    <Download className="h-4 w-4" />
                </Button>
            )}
            {onSettings && (
                <Button variant="ghost" size="icon" onClick={onSettings} className="h-8 w-8" aria-label="Table settings">
                    <Settings className="h-4 w-4" />
                </Button>
            )}
            {onMore && !hideMore && (
                <Button variant="ghost" size="icon" onClick={onMore} className="h-8 w-8" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}

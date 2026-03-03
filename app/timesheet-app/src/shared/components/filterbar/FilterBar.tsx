import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { FilterBarField } from './FilterBarField';
import type { FilterBarProps } from './types';
import { FilterSettingsDialog, type FilterSetting } from '../dialogs';

/**
 * FilterBar (SAP UI5 Style)
 * 
 * Configuration-driven filter bar with:
 * - Go button to apply filters
 * - Hide/Show toggle for filter area
 * - Clear button to reset all filters
 * - Responsive grid layout for filter fields
 */
export function FilterBar({
    config,
    values,
    onChange,
    onApply,
    isLoading = false,
    defaultExpanded = true,
    className = '',
    renderFieldOverlay,
}: FilterBarProps) {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Manage order and visibility of filter fields locally
    const [fieldSettings, setFieldSettings] = useState<FilterSetting[]>(() =>
        config.map(f => ({
            key: f.key,
            label: f.labelKey ? (t(f.labelKey, f.label) as string) : f.label,
            visible: f.visible !== false
        }))
    );

    // Sync if config changes
    useEffect(() => {
        setFieldSettings(prev => {
            const currentKeys = new Set(prev.map(s => s.key));
            const newConfigKeys = new Set(config.map(f => f.key));

            let next = prev.filter(s => newConfigKeys.has(s.key));

            config.forEach(f => {
                if (!currentKeys.has(f.key)) {
                    next.push({
                        key: f.key,
                        label: f.labelKey ? (t(f.labelKey, f.label) as string) : f.label,
                        visible: f.visible !== false
                    });
                } else {
                    const existing = next.find(s => s.key === f.key);
                    if (existing) {
                        existing.label = f.labelKey ? (t(f.labelKey, f.label) as string) : f.label;
                    }
                }
            });

            return next;
        });
    }, [config, t]);

    // Handle individual field change
    const handleFieldChange = useCallback((key: string, value: unknown) => {
        onChange({
            ...values,
            [key]: value,
        });
    }, [values, onChange]);

    // Handle apply (Go button)
    const handleApply = () => {
        onApply(values);
    };

    // Get visible filters
    const visibleFilters = useMemo(() => {
        return fieldSettings
            .filter(s => s.visible)
            .map(s => config.find(f => f.key === s.key))
            .filter((f): f is NonNullable<typeof f> => f !== undefined);
    }, [fieldSettings, config]);

    return (
        <div className={`bg-card rounded-xl border-2 hover:border-primary transition-all ${className}`}>
            {/* Header row with Go button and toggle */}
            <div className="flex items-center justify-end gap-3 px-4 py-2 border-b border-border">
                {/* Go Button */}
                <Button
                    onClick={handleApply}
                    variant="default" // Using default (primary brand color from theme)
                    disabled={isLoading}
                    className="min-w-[60px]"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('filterbar.loading', 'Loading...')}
                        </>
                    ) : (
                        t('filterbar.go', 'Go')
                    )}
                </Button>

                {/* Hide/Show Filter Bar Toggle */}
                <Button
                    onClick={() => setIsExpanded(!isExpanded)}
                    variant="ghost"
                    className="text-primary hover:text-primary hover:bg-primary/5"
                >
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-2" />
                    {isExpanded
                        ? t('filterbar.hideFilterBar', 'Hide Filter Bar')
                        : t('filterbar.showFilterBar', 'Show Filter Bar')}
                </Button>

                {/* Filters */}
                <Button
                    onClick={() => setIsSettingsOpen(true)}
                    variant="ghost"
                    className="text-primary hover:text-primary hover:bg-primary/5"
                >
                    {t('filterbar.Filter', 'Filter')}
                </Button>
            </div>

            {/* Filter Fields Area (Collapsible) */}
            {isExpanded && (
                <div className="px-4 py-4">
                    {/* Responsive grid: auto-fill columns */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-6 gap-y-4">
                        {visibleFilters.map((fieldConfig) => (
                            <FilterBarField
                                key={fieldConfig.key}
                                config={fieldConfig}
                                value={values[fieldConfig.key]}
                                onChange={(value) => handleFieldChange(fieldConfig.key, value)}
                                overlay={renderFieldOverlay?.(fieldConfig.key)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <FilterSettingsDialog
                open={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                filters={fieldSettings}
                onApply={setFieldSettings}
            />
        </div>
    );
}

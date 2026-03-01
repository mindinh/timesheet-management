import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextFilter } from '@/shared/components/ui/text-filter';
import { MultiSelectFilter } from '@/shared/components/ui/multi-select-filter';
import { DateRangeFilter } from '@/shared/components/ui/date-range-filter';
import { ValueHelpFilter } from '@/shared/components/ui/value-help-filter';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import type { FilterFieldConfig } from './types';

interface FilterBarFieldProps {
    config: FilterFieldConfig;
    value: unknown;
    onChange: (value: unknown) => void;
    /** Optional overlay element (e.g. ValueHelpIcon) rendered inside the field */
    overlay?: React.ReactNode;
}

export function FilterBarField({ config, value, onChange, overlay }: FilterBarFieldProps) {
    const { t } = useTranslation();

    const label = config.labelKey ? t(config.labelKey, config.label) : config.label;
    const placeholder = config.placeholder || t('common.select', 'Select...');

    return (
        <div className="space-y-1.5 flex flex-col" style={{ width: config.width }}>
            <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                {label} {config.required && <span className="text-destructive">*</span>}
            </Label>

            <div className="flex-1 relative">
                {RenderFilterControl(config, value, onChange, placeholder)}
                {overlay}
            </div>
        </div>
    );
}

function RenderFilterControl(
    config: FilterFieldConfig,
    value: unknown,
    onChange: (value: unknown) => void,
    placeholder: string
) {
    switch (config.type) {
        case 'text':
            return (
                <TextFilter
                    config={config}
                    value={value}
                    onChange={onChange}
                />
            );

        case 'select':
            return (
                <Select value={value as string} onValueChange={onChange}>
                    <SelectTrigger className="h-8 bg-background">
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {config.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                    {opt.icon && <opt.icon className="w-4 h-4" />}
                                    <span>{opt.label}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );

        case 'multiselect':
            return (
                <MultiSelectFilter
                    config={config}
                    value={value}
                    onChange={onChange}
                />
            );

        case 'dateRange':
            return (
                <DateRangeFilter
                    config={config}
                    value={value}
                    onChange={onChange}
                />
            );

        case 'valueHelp':
            return (
                <ValueHelpFilter
                    config={config}
                    value={value}
                    onChange={onChange}
                />
            );

        default:
            return null;
    }
}

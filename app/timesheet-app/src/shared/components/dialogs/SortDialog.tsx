import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Label } from '@/shared/components/ui/label';

export interface SortByOption {
    key: string;
    label: string;
}

export interface SortOption {
    order: 'ascending' | 'descending';
    by: string;
}

interface SortDialogProps {
    open: boolean;
    onClose: () => void;
    onApply: (sortOption: SortOption) => void;
    sortByOptions: SortByOption[];
    defaultSort?: SortOption;
}

export function SortDialog({
    open,
    onClose,
    onApply,
    sortByOptions,
    defaultSort,
}: SortDialogProps) {
    const { t } = useTranslation();

    const resolvedDefault = useMemo(() => defaultSort ?? {
        order: 'descending' as const,
        by: sortByOptions[0]?.key ?? '',
    }, [defaultSort, sortByOptions]);

    const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>(resolvedDefault.order);
    const [sortBy, setSortBy] = useState<string>(resolvedDefault.by);

    useEffect(() => {
        if (open) {
            setSortOrder(resolvedDefault.order);
            setSortBy(resolvedDefault.by);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, resolvedDefault]);

    const isAtDefault = sortOrder === resolvedDefault.order && sortBy === resolvedDefault.by;

    const handleReset = () => {
        setSortOrder(resolvedDefault.order);
        setSortBy(resolvedDefault.by);
    };

    const handleOk = () => {
        onApply({ order: sortOrder, by: sortBy });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent hideCloseButton className="sm:max-w-[400px] flex flex-col p-0 gap-0 overflow-hidden max-h-[80vh]">
                {/* Header */}
                <DialogHeader className="flex flex-row items-center justify-between p-4 border-b border-border flex-shrink-0 space-y-0 text-left">
                    <DialogTitle className="text-base font-semibold text-foreground">{t('common.sort')}</DialogTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={isAtDefault}
                        className={`text-sm font-medium text-destructive hover:text-destructive/80 hover:bg-transparent ${isAtDefault ? 'opacity-50' : ''}`}
                    >
                        {t('common.reset')}
                    </Button>
                </DialogHeader>

                {/* Content - Scrollable Table */}
                <div className="overflow-y-auto flex-1 pb-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">

                    {/* Sort Order Section */}
                    <div>
                        <div className="px-4 py-3 bg-muted/30 border-b border-border">
                            <h3 className="text-sm font-semibold text-foreground">{t('dialogs.sort.sortOrder', 'Sort Order')}</h3>
                        </div>
                        <RadioGroup
                            value={sortOrder}
                            onValueChange={(val) => setSortOrder(val as 'ascending' | 'descending')}
                            className="gap-0 w-full"
                        >
                            <Label
                                htmlFor="order-ascending"
                                className={`flex items-center space-x-3 py-3 px-4 cursor-pointer border-b border-border transition-colors ${sortOrder === 'ascending' ? 'bg-destructive/10' : 'hover:bg-muted/50'}`}
                            >
                                <RadioGroupItem value="ascending" id="order-ascending" className={sortOrder === 'ascending' ? 'border-destructive text-destructive' : ''} />
                                <span className="text-sm font-normal text-foreground">{t('dialogs.sort.ascending')}</span>
                            </Label>

                            <Label
                                htmlFor="order-descending"
                                className={`flex items-center space-x-3 py-3 px-4 cursor-pointer border-b border-border transition-colors ${sortOrder === 'descending' ? 'bg-destructive/10' : 'hover:bg-muted/50'}`}
                            >
                                <RadioGroupItem value="descending" id="order-descending" className={sortOrder === 'descending' ? 'border-destructive text-destructive' : ''} />
                                <span className="text-sm font-normal text-foreground">{t('dialogs.sort.descending')}</span>
                            </Label>
                        </RadioGroup>
                    </div>

                    {/* Sort By Section using Table Structure */}
                    <div>
                        <div className="px-4 py-3 bg-muted/30 border-b border-border">
                            <h3 className="text-sm font-semibold text-foreground">{t('dialogs.sort.sortBy', 'Sort By')}</h3>
                        </div>

                        <RadioGroup
                            value={sortBy}
                            onValueChange={setSortBy}
                            className="gap-0 w-full"
                        >
                            {sortByOptions.map((option) => (
                                <Label
                                    key={option.key}
                                    htmlFor={`sort-by-${option.key}`}
                                    className={`flex items-center space-x-3 py-3 px-4 cursor-pointer border-b border-border transition-colors ${sortBy === option.key ? 'bg-destructive/10' : 'hover:bg-muted/50'}`}
                                >
                                    <RadioGroupItem value={option.key} id={`sort-by-${option.key}`} className={sortBy === option.key ? 'border-destructive text-destructive' : ''} />
                                    <span className="text-sm font-normal text-foreground">{option.label}</span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="p-3 border-t border-border flex-shrink-0 bg-background sm:justify-end flex-row gap-2">
                    <Button
                        variant="create"
                        onClick={handleOk}
                        className="rounded-xl min-w-[80px]"
                    >
                        {t('common.ok')}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-xl min-w-[80px]"
                    >
                        {t('common.cancel')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

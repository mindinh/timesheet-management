import { useTranslation } from 'react-i18next';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';

const LOGOS = {
    en: '🇬🇧',
    vi: '🇻🇳',
    ja: '🇯🇵',
    de: '🇩🇪'
};

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'vi', label: 'Vietnamese' },
    { code: 'ja', label: '日本語' },
    { code: 'de', label: 'Deutsch' }
];

interface LanguageSwitcherProps {
    isCollapsed?: boolean;
}

export default function LanguageSwitcher({ isCollapsed = false }: LanguageSwitcherProps) {
    const { i18n } = useTranslation();

    const handleLanguageChange = (value: string) => {
        i18n.changeLanguage(value);
    };

    return (
        <div className="px-4 pb-2 w-full">
            {!isCollapsed && (
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Language
                </label>
            )}
            <Select value={i18n.language || 'en'} onValueChange={handleLanguageChange}>
                <SelectTrigger className={isCollapsed ? 'px-2 flex justify-center w-full' : 'w-full'}>
                    {isCollapsed ? (
                        <span>{LOGOS[i18n.language as keyof typeof LOGOS] || '🌐'}</span>
                    ) : (
                        <SelectValue placeholder="Select Language" />
                    )}
                </SelectTrigger>
                <SelectContent>
                    {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                            <div className="flex items-center gap-2">
                                <span>{LOGOS[lang.code as keyof typeof LOGOS]}</span>
                                <span>{lang.label}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

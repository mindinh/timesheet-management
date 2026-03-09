/**
 * Shared locale-aware formatters.
 *
 * Every locale follows SAP Fiori / system locale conventions:
 *
 * Locale │ Date │ DateTime │ Number
 * ───────┼───────────────┼─────────────────────────┼──────────
 * en │ Mar 8, 2026 │ Mar 8, 2026, 1:22 PM │ 1,000.2
 * de │ 08.03.2026 │ 08.03.2026, 13:22 │ 1.000,2
 * ja │ 2026/03/08 │ 2026/03/08 13:22 │ 1,000.2
 * vi │ 08/03/2026 │ 08/03/2026 13:22 │ 1.000,2
 *
 * Usage:
 * import { fmtDate, fmtDateTime, fmtPeriod, fmtNumber } from '@/shared/lib/formatters'
 */

import { format } from 'date-fns';
import { enUS, de, ja, vi } from 'date-fns/locale';
import type { Locale } from 'date-fns';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — i18n.js has no type declaration; language string is safe to read
import i18n from '@/core/i18n/i18n';

// ─── Locale registry ─────────────────────────────────────────────────────────

type LocaleCfg = {
  dateFns: Locale;
  /** date-fns pattern for date-only display */
  datePattern: string;
  /** date-fns pattern for date+time display */
  datetimePattern: string;
  /** date-fns pattern for long month+year ("March 2026") */
  periodPattern: string;
  /** date-fns pattern for short month+year ("Mar 2026") */
  periodShortPattern: string;
  /** Intl.NumberFormat locale tag */
  numberLocale: string;
};

const LOCALES: Record<string, LocaleCfg> = {
  en: {
    dateFns: enUS,
    datePattern: 'MMM d, yyyy', // Mar 8, 2026
    datetimePattern: 'MMM d, yyyy, h:mm a', // Mar 8, 2026, 1:22 PM (12 h)
    periodPattern: 'MMMM yyyy', // March 2026
    periodShortPattern: 'MMM yyyy', // Mar 2026
    numberLocale: 'en-US', // 1,000.2
  },
  de: {
    dateFns: de,
    datePattern: 'dd.MM.yyyy', // 08.03.2026
    datetimePattern: 'dd.MM.yyyy, HH:mm', // 08.03.2026, 13:22 (24 h)
    periodPattern: 'MMMM yyyy', // März 2026
    periodShortPattern: 'MMM yyyy', // Mär 2026
    numberLocale: 'de-DE', // 1.000,2
  },
  ja: {
    dateFns: ja,
    datePattern: 'yyyy/MM/dd', // 2026/03/08
    datetimePattern: 'yyyy/MM/dd HH:mm', // 2026/03/08 13:22 (24 h)
    periodPattern: 'yyyy年M月', // 2026年3月
    periodShortPattern: 'yyyy/MM', // 2026/03
    numberLocale: 'ja-JP', // 1,000.2
  },
  vi: {
    dateFns: vi,
    datePattern: 'dd/MM/yyyy', // 08/03/2026
    datetimePattern: 'dd/MM/yyyy HH:mm', // 08/03/2026 13:22 (24 h)
    periodPattern: "MMMM 'năm' yyyy", // Tháng 3 năm 2026
    periodShortPattern: 'MM/yyyy', // 03/2026
    numberLocale: 'vi-VN', // 1.000,2
  },
};

const DEFAULT_CFG = LOCALES.en;

function getCfg(): LocaleCfg {
  const lang = (i18n.language as string | undefined)?.split('-')[0] ?? 'en';
  return LOCALES[lang] ?? DEFAULT_CFG;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Locale-aware date formatting (date only).
 * en →"Mar 8, 2026" de →"08.03.2026" ja →"2026/03/08" vi →"08/03/2026"
 */
export function fmtDate(value?: string | Date | null, overridePattern?: string): string {
  const d = toDate(value);
  if (!d) return '—';
  const cfg = getCfg();
  return format(d, overridePattern ?? cfg.datePattern, { locale: cfg.dateFns });
}

/**
 * Locale-aware date+time formatting.
 * en →"Mar 8, 2026, 1:22 PM" de →"08.03.2026, 13:22" ja →"2026/03/08 13:22"
 */
export function fmtDateTime(value?: string | Date | null, overridePattern?: string): string {
  const d = toDate(value);
  if (!d) return '—';
  const cfg = getCfg();
  return format(d, overridePattern ?? cfg.datetimePattern, { locale: cfg.dateFns });
}

/**
 * Locale-aware month+year period.
 * en →"March 2026" de →"März 2026" ja →"2026年3月" vi →"Tháng 3 năm 2026"
 */
export function fmtPeriod(month: number, year: number): string {
  const cfg = getCfg();
  return format(new Date(year, month - 1, 1), cfg.periodPattern, { locale: cfg.dateFns });
}

/**
 * Short locale-aware month+year.
 * en →"Mar 2026" de →"Mär 2026" ja →"2026/03" vi →"03/2026"
 */
export function fmtPeriodShort(month: number, year: number): string {
  const cfg = getCfg();
  return format(new Date(year, month - 1, 1), cfg.periodShortPattern, { locale: cfg.dateFns });
}

// ─── Number helper ────────────────────────────────────────────────────────────

/**
 * Locale-aware number formatting.
 * en →"1,000.2" de →"1.000,2" ja →"1,000.2" vi →"1.000,2"
 *
 * @param value - number to format
 * @param maximumFractionDigits - decimal places (default 1)
 */
export function fmtNumber(value: number | null | undefined, maximumFractionDigits = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const cfg = getCfg();
  return new Intl.NumberFormat(cfg.numberLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

/**
 * Get today's date as ISO string (YYYY-MM-DD).
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

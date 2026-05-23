import { writable, derived } from 'svelte/store';
import { en } from './en';
import { es } from './es';
import type { TranslationDictionary } from './types';

export type Locale = 'en' | 'es';

const dictionaries: Record<Locale, TranslationDictionary> = {
    en,
    es
};

const defaultLocale: Locale = 'en';
let initialLocale = defaultLocale;
if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('library_locale');
    if (saved === 'en' || saved === 'es') {
        initialLocale = saved;
    }
}

export const locale = writable<Locale>(initialLocale);

if (typeof window !== 'undefined') {
    locale.subscribe((value) => {
        localStorage.setItem('library_locale', value);
    });
}

export const t = derived(locale, ($locale) => {
    return dictionaries[$locale];
});

export function setLocale(newLocale: Locale) {
    locale.set(newLocale);
}
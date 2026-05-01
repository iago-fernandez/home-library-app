import { writable, derived } from 'svelte/store';
import { en } from './en';
import { es } from './es';
import type { TranslationDictionary } from './types';

export type Locale = 'en' | 'es';

const dictionaries: Record<Locale, TranslationDictionary> = {
    en,
    es
};

export const locale = writable<Locale>('en');

export const t = derived(locale, ($locale) => {
    return dictionaries[$locale];
});

export function setLocale(newLocale: Locale) {
    locale.set(newLocale);
}
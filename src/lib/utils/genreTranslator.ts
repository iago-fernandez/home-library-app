import { get } from 'svelte/store';
import { t } from '$lib/i18n';

export function translateGenres(genres: string[]): string[] {
    const translations = get(t).genres;
    // Map lowercase dictionary keys for case-insensitive lookup
    const lowerDict: Record<string, string> = {};
    for (const [key, val] of Object.entries(translations)) {
        lowerDict[key.toLowerCase()] = val;
    }

    return genres.map(genre => {
        const lowerGenre = genre.toLowerCase().trim();
        if (lowerDict[lowerGenre]) {
            return lowerDict[lowerGenre];
        }
        // Fallback to original string if not found
        return genre;
    });
}

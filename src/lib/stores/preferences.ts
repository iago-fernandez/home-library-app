import { writable } from 'svelte/store';

const PREF_KEY = 'library_datagrid_columns';
const MOSAIC_PREF_KEY = 'library_mosaic_attributes';

export function createGenericStore<T>(storageKey: string, defaultValue: T) {
    let initial = defaultValue;

    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    initial = { ...defaultValue, ...parsed };
                } else if (parsed !== null) {
                    initial = parsed;
                }
            } catch (e) {
                initial = defaultValue;
            }
        }
    }

    const { subscribe, set, update } = writable<T>(initial);

    return {
        subscribe,
        set: (val: T) => {
            if (typeof window !== 'undefined') {
                localStorage.setItem(storageKey, JSON.stringify(val));
            }
            set(val);
        },
        update: (updater: (val: T) => T) => {
            update(current => {
                const newVal = updater(current);
                if (typeof window !== 'undefined') {
                    localStorage.setItem(storageKey, JSON.stringify(newVal));
                }
                return newVal;
            });
        },
        reset: () => {
            if (typeof window !== 'undefined') {
                localStorage.setItem(storageKey, JSON.stringify(defaultValue));
            }
            set(defaultValue);
        }
    };
}

export const availableColumns = [
    { id: 'catalog_number', label: 'ID' },
    { id: 'title', label: 'Title' },
    { id: 'subtitle', label: 'Subtitle' },
    { id: 'original_title', label: 'Original Title' },
    { id: 'authors', label: 'Authors' },
    { id: 'translators', label: 'Translators' },
    { id: 'illustrators', label: 'Illustrators' },
    { id: 'publisher', label: 'Publisher' },
    { id: 'publish_date', label: 'Publication Date' },
    { id: 'original_publish_date', label: 'Orig. Pub. Date' },
    { id: 'isbn_13', label: 'ISBN-13' },
    { id: 'isbn_10', label: 'ISBN-10' },
    { id: 'oclc_number', label: 'OCLC Number' },
    { id: 'open_library_id', label: 'OpenLibrary ID' },
    { id: 'edition_number', label: 'Edition' },
    { id: 'printing_number', label: 'Printing' },
    { id: 'original_edition', label: 'Original Edition' },
    { id: 'is_first_edition', label: 'First Edition' },
    { id: 'collection_name', label: 'Collection' },
    { id: 'volume_in_collection', label: 'Vol. in Collection' },
    { id: 'series_name', label: 'Series' },
    { id: 'volume_in_series', label: 'Vol. in Series' },
    { id: 'book_format', label: 'Format' },
    { id: 'page_count', label: 'Pages' },
    { id: 'dimensions', label: 'Dimensions' },
    { id: 'weight', label: 'Weight' },
    { id: 'language', label: 'Language' },
    { id: 'original_language', label: 'Original Language' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'genres', label: 'Genres' },
    { id: 'target_audience', label: 'Target Audience' },
    { id: 'purchase_date', label: 'Purchase Date' },
    { id: 'purchase_price', label: 'Purchase Price' },
    { id: 'store_or_vendor', label: 'Vendor' },
    { id: 'acquisition_type', label: 'Acquisition Type' },
    { id: 'location_property', label: 'Property' },
    { id: 'location_room', label: 'Room' },
    { id: 'location_bookcase', label: 'Bookcase' },
    { id: 'location_shelf', label: 'Shelf' },
    { id: 'location_position', label: 'Position' },
    { id: 'condition_state', label: 'Condition' },
    { id: 'read_status', label: 'Read Status' },
    { id: 'rating', label: 'Rating' },
    { id: 'date_started', label: 'Date Started' },
    { id: 'date_finished', label: 'Date Finished' },
    { id: 'is_loaned', label: 'Is Loaned' },
    { id: 'loaned_to', label: 'Loaned To' },
    { id: 'loan_date', label: 'Loan Date' },
    { id: 'expected_return_date', label: 'Expected Return' }
];

const defaultColumns = [
    'title',
    'authors',
    'isbn_13',
    'publish_date',
    'publisher'
];

const defaultMosaicAttributes = [
    'authors',
    'publish_date'
];

function createStore(storageKey: string, defaultValues: string[], validKeys?: string[]) {
    let initial = defaultValues;

    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    const allowedKeys = validKeys || defaultValues;
                    initial = parsed.filter(item => allowedKeys.includes(item));
                    if (initial.length === 0) initial = defaultValues;
                }
            } catch (e) {
                initial = defaultValues;
            }
        }
    }

    const { subscribe, set } = writable<string[]>(initial);

    return {
        subscribe,
        set: (val: string[]) => {
            if (typeof window !== 'undefined') {
                localStorage.setItem(storageKey, JSON.stringify(val));
            }
            set(val);
        },
        reset: () => {
            if (typeof window !== 'undefined') {
                localStorage.setItem(storageKey, JSON.stringify(defaultValues));
            }
            set(defaultValues);
        }
    };
}

const validColumnIds = availableColumns.map(c => c.id);
export const activeColumns = createStore(PREF_KEY, defaultColumns, validColumnIds);
export const activeMosaicAttributes = createStore(MOSAIC_PREF_KEY, defaultMosaicAttributes, validColumnIds);

// Appearance & Zoom
export const zoomLevel = createGenericStore<number>('library_zoom', 100);
export const activeTheme = createGenericStore<string>('library_theme', 'sky');
export const activeViewStore = createGenericStore<'table' | 'mosaic'>('library_active_view', 'table');
export const autocompleteLimit = createGenericStore<number>('library_autocomplete_limit', 10);

export const appThemes = {
    sky: { name: 'Ocean Blue', primary: '#0284C7', hover: '#0369A1', secondary: '#F0F9FF', topbarBg: '#334155', topbarBorder: '#1E293B' },
    emerald: { name: 'Emerald', primary: '#059669', hover: '#047857', secondary: '#ECFDF5', topbarBg: '#064E3B', topbarBorder: '#022C22' },
    amethyst: { name: 'Amethyst', primary: '#7C3AED', hover: '#6D28D9', secondary: '#F5F3FF', topbarBg: '#4C1D95', topbarBorder: '#2E1065' },
    slate: { name: 'Graphite', primary: '#475569', hover: '#334155', secondary: '#F8FAFC', topbarBg: '#1E293B', topbarBorder: '#0F172A' },
    teal: { name: 'Teal', primary: '#0D9488', hover: '#0F766E', secondary: '#F0FDFA', topbarBg: '#115E59', topbarBorder: '#042F2E' },
    amber: { name: 'Amber', primary: '#D97706', hover: '#B45309', secondary: '#FFFBEB', topbarBg: '#78350F', topbarBorder: '#451A03' }
};

// Shortcuts
export const defaultShortcuts = {
    newBook: 'ctrl+a',
    search: 'ctrl+f',
    toggleMultiSelect: 'ctrl+m',
    deleteSelected: 'delete',
    settings: 'ctrl+,',
    export: 'ctrl+e'
};
export const activeShortcuts = createGenericStore<Record<string, string>>('library_shortcuts', defaultShortcuts);
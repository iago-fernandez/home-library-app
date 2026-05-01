import type { TranslationDictionary } from './types';

export const en: TranslationDictionary = {
    common: {
        add: 'Add',
        edit: 'Edit',
        delete: 'Delete',
        cancel: 'Cancel',
        save: 'Save',
        clear: 'Clear',
        search: 'Search',
        selected: 'Selected',
        refresh: 'Refresh'
    },
    menu: {
        file: 'File',
        edit: 'Edit',
        view: 'View',
        tools: 'Tools',
        help: 'Help',
        newLibrary: 'New Library',
        settings: 'Settings',
        exit: 'Exit',
        findInView: 'Find in view (Ctrl+F)',
        advancedFilter: 'Advanced Filter',
        toggleSidebar: 'Toggle Sidebar',
        importIsbn: 'Import ISBN List',
        exportCsv: 'Export to CSV',
        documentation: 'Documentation',
        about: 'About',
        enterMultiSelect: 'Enter Multi-Select Mode',
        exitMultiSelect: 'Exit Multi-Select Mode (Esc)'
    },
    grid: {
        title: 'Title',
        authors: 'Authors',
        publisher: 'Publisher',
        date: 'Date',
        isbn: 'ISBN',
        room: 'Room',
        bookcase: 'Bookcase',
        noMatches: 'No matches',
        findPlaceholder: 'Find in loaded rows (Ctrl+F)'
    },
    filters: {
        activeFilters: 'Active Filters',
        clearAll: 'Clear All',
        addRule: 'Add Rule',
        matchAll: 'All rules (AND)',
        matchAny: 'Any rule (OR)',
        invertRule: 'Invert Rule (NOT)',
        caseSensitive: 'Case Sensitive'
    }
};
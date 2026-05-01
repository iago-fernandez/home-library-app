export interface TranslationDictionary {
    common: {
        add: string;
        edit: string;
        delete: string;
        cancel: string;
        save: string;
        clear: string;
        search: string;
        selected: string;
        refresh: string;
    };
    menu: {
        file: string;
        edit: string;
        view: string;
        tools: string;
        help: string;
        newLibrary: string;
        settings: string;
        exit: string;
        findInView: string;
        advancedFilter: string;
        toggleSidebar: string;
        importIsbn: string;
        exportCsv: string;
        documentation: string;
        about: string;
        enterMultiSelect: string;
        exitMultiSelect: string;
    };
    grid: {
        title: string;
        authors: string;
        publisher: string;
        date: string;
        isbn: string;
        room: string;
        bookcase: string;
        noMatches: string;
        findPlaceholder: string;
    };
    filters: {
        activeFilters: string;
        clearAll: string;
        addRule: string;
        matchAll: string;
        matchAny: string;
        invertRule: string;
        caseSensitive: string;
    };
}
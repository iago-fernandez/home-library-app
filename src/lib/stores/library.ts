import { writable, get } from 'svelte/store';
import type { Library } from '../types/library';
import { apiClient } from '../api/client';
import { authStore } from './auth';

interface LibraryState {
    libraries: Library[];
    activeLibraryId: string | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: LibraryState = {
    libraries: [],
    activeLibraryId: null,
    isLoading: false,
    error: null
};

function createLibraryStore() {
    const { subscribe, set, update } = writable<LibraryState>(initialState);

    return {
        subscribe,
        
        async fetchLibraries() {
            update(state => ({ ...state, isLoading: true, error: null }));
            try {
                const libs = await apiClient.getLibraries();
                update(state => {
                    let activeId = state.activeLibraryId;
                    if (libs.length > 0) {
                        // Keep current active id if it still exists in the fetched list
                        if (!activeId || !libs.find(l => l.id === activeId)) {
                            activeId = libs[0].id; // default to first
                        }
                    } else {
                        activeId = null;
                    }

                    return {
                        ...state,
                        libraries: libs,
                        activeLibraryId: activeId,
                        isLoading: false
                    };
                });
            } catch (err: any) {
                update(state => ({ ...state, error: err.message, isLoading: false }));
            }
        },

        setActiveLibrary(id: string) {
            update(state => {
                if (state.libraries.find(l => l.id === id)) {
                    return { ...state, activeLibraryId: id };
                }
                return state;
            });
        },

        reset() {
            set(initialState);
        }
    };
}

export const libraryStore = createLibraryStore();

// Watch auth store to fetch libraries on login and reset on logout
authStore.subscribe(state => {
    if (state.token) {
        libraryStore.fetchLibraries();
    } else {
        libraryStore.reset();
    }
});

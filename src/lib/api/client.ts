import type { Book, CreateBookPayload, UpdateBookPayload, PaginatedResponse, BookMetadataResponse } from '../types/book';
import type { AuthRequest, AuthResponse, User } from '../types/auth';
import type { Library, CreateLibraryPayload, UpdateLibraryPayload, LibraryMember, ShareLibraryPayload } from '../types/library';
import { sanitizeBookPayload } from './sanitizer';
import { authStore } from '../stores/auth';
import { get } from 'svelte/store';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL || '/auth';

function buildUrl(path: string): URL {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(path, base);
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const state = get(authStore);
    const headers: Record<string, string> = { ...customHeaders };
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    return headers;
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, options);
    if (response.status === 401) {
        authStore.set({ token: null, user: null });
    }
    return response;
}

export const apiClient = {
    async register(payload: AuthRequest): Promise<AuthResponse> {
        const response = await fetch(`${AUTH_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Registration failed');
        const data = await response.json();
        authStore.set({ token: data.token, user: data.user });
        return data;
    },

    async login(payload: AuthRequest): Promise<AuthResponse> {
        const response = await fetch(`${AUTH_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            let errorText = 'Login failed';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/html')) {
                    errorText = 'Connection Error: Invalid response from server (possible bad gateway or proxy issue).';
                } else {
                    const errBody = await response.text();
                    if (errBody) errorText = errBody;
                }
            } catch (e) {}
            throw new Error(errorText);
        }
        const data = await response.json();
        authStore.set({ token: data.token, user: data.user });
        return data;
    },

    logout() {
        authStore.set({ token: null, user: null });
    },

    async getBooks(
        limit = 50,
        offset = 0,
        sortBy?: string,
        sortOrder?: 'asc' | 'desc',
        queryJson?: string,
        libraryId?: string
    ): Promise<PaginatedResponse> {
        const url = buildUrl(`${API_BASE_URL}/books`);
        url.searchParams.append('limit', limit.toString());
        url.searchParams.append('offset', offset.toString());

        if (sortBy) url.searchParams.append('sort_by', sortBy);
        if (sortOrder) url.searchParams.append('sort_order', sortOrder);
        if (queryJson) url.searchParams.append('query', queryJson);
        if (libraryId) url.searchParams.append('library_id', libraryId);

        const response = await apiFetch(url.toString(), {
            method: 'GET',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch books');
        return response.json();
    },

    async createBook(payload: CreateBookPayload): Promise<Book> {
        const safePayload = sanitizeBookPayload(payload);
        const response = await apiFetch(`${API_BASE_URL}/books`, {
            method: 'POST',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(safePayload)
        });
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Failed to create book: ${errBody}`);
        }
        return response.json();
    },

    async updateBook(id: string, payload: UpdateBookPayload): Promise<Book> {
        const safePayload = sanitizeBookPayload(payload);
        const response = await apiFetch(`${API_BASE_URL}/books/${id}`, {
            method: 'PUT',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(safePayload)
        });
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Failed to update book: ${errBody}`);
        }
        return response.json();
    },

    async patchBook(id: string, payload: Record<string, any>): Promise<Book> {
        const response = await apiFetch(`${API_BASE_URL}/books/${id}`, {
            method: 'PATCH',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Failed to patch book: ${errBody}`);
        }
        return response.json();
    },

    async deleteBook(id: string): Promise<void> {
        const response = await apiFetch(`${API_BASE_URL}/books/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete book');
    },

    async deleteBooksBatch(ids: string[]): Promise<void> {
        const response = await apiFetch(`${API_BASE_URL}/books/batch-delete`, {
            method: 'POST',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ ids })
        });
        if (!response.ok) throw new Error('Failed to batch delete');
    },

    async lookupMetadata(identifier: string): Promise<BookMetadataResponse> {
        const response = await apiFetch(`${API_BASE_URL}/lookup/metadata/${identifier}`, {
            method: 'GET',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to lookup metadata');
        return response.json();
    },

    async searchMetadata(query: string): Promise<BookMetadataResponse[]> {
        const url = buildUrl(`${API_BASE_URL}/lookup/search`);
        url.searchParams.append('q', query);
        const response = await apiFetch(url.toString(), {
            method: 'GET',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to search metadata');
        return response.json();
    },

    async getAutocomplete(field: string, query: string, limit: number = 10): Promise<string[]> {
        const url = buildUrl(`${API_BASE_URL}/lookup/autocomplete`);
        url.searchParams.append('field', field);
        url.searchParams.append('q', query);
        url.searchParams.append('limit', limit.toString());
        const response = await apiFetch(url.toString(), {
            method: 'GET',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch autocomplete suggestions');
        return response.json();
    },

    async uploadCover(file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('cover', file);

        const response = await apiFetch(`${API_BASE_URL}/upload/cover`, {
            method: 'POST',
            headers: getHeaders(),
            body: formData
        });

        if (!response.ok) throw new Error('Failed to upload cover');
        return response.json();
    },

    async exportData(format: string, payload: any): Promise<void> {
        const response = await apiFetch(`${API_BASE_URL}/export/${format}`, {
            method: 'POST',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to export data');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `library_export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    },

    async updateProfile(payload: AuthRequest): Promise<User> {
        const response = await apiFetch(`${API_BASE_URL}/users/me`, {
            method: 'PUT',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update profile');
        return response.json();
    },

    async deleteAccount(): Promise<void> {
        const response = await apiFetch(`${API_BASE_URL}/users/me`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete account');
        this.logout();
    },

    async getLibraries(): Promise<Library[]> {
        const response = await apiFetch(`${API_BASE_URL}/libraries`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch libraries');
        return response.json();
    },

    async createLibrary(payload: CreateLibraryPayload): Promise<Library> {
        const response = await apiFetch(`${API_BASE_URL}/libraries`, {
            method: 'POST',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to create library');
        return response.json();
    },

    async updateLibrary(id: string, payload: UpdateLibraryPayload): Promise<Library> {
        const response = await apiFetch(`${API_BASE_URL}/libraries/${id}`, {
            method: 'PUT',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update library');
        return response.json();
    },

    async deleteLibrary(id: string): Promise<void> {
        const response = await apiFetch(`${API_BASE_URL}/libraries/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete library');
    },

    async getLibraryMembers(libraryId: string): Promise<LibraryMember[]> {
        const response = await apiFetch(`${API_BASE_URL}/libraries/${libraryId}/members`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch library members');
        return response.json();
    },

    async addLibraryMember(libraryId: string, payload: ShareLibraryPayload): Promise<LibraryMember> {
        const response = await apiFetch(`${API_BASE_URL}/libraries/${libraryId}/members`, {
            method: 'POST',
            headers: getHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(errBody || 'Failed to add library member');
        }
        return response.json();
    },

    async removeLibraryMember(libraryId: string, userId: string): Promise<void> {
        const response = await apiFetch(`${API_BASE_URL}/libraries/${libraryId}/members/${userId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to remove library member');
    }
};
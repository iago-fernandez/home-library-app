import type { Book, CreateBookPayload, UpdateBookPayload, PaginatedResponse, BookMetadataResponse } from '../types/book';
import { sanitizeBookPayload } from './sanitizer';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = {
    async getBooks(
        limit = 50,
        offset = 0,
        sortBy?: string,
        sortOrder?: 'asc' | 'desc',
        queryJson?: string
    ): Promise<PaginatedResponse> {
        const url = new URL(`${API_BASE_URL}/books`);
        url.searchParams.append('limit', limit.toString());
        url.searchParams.append('offset', offset.toString());

        if (sortBy) url.searchParams.append('sort_by', sortBy);
        if (sortOrder) url.searchParams.append('sort_order', sortOrder);
        if (queryJson) url.searchParams.append('query', queryJson);

        const response = await fetch(url.toString(), { method: 'GET' });
        if (!response.ok) throw new Error('Failed to fetch books');
        return response.json();
    },

    async createBook(payload: CreateBookPayload): Promise<Book> {
        const safePayload = sanitizeBookPayload(payload);
        const response = await fetch(`${API_BASE_URL}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(`${API_BASE_URL}/books/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(safePayload)
        });
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Failed to update book: ${errBody}`);
        }
        return response.json();
    },

    async deleteBook(id: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/books/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete book');
    },

    async deleteBooksBatch(ids: string[]): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/books/batch`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        if (!response.ok) throw new Error('Failed to batch delete');
    },

    async lookupMetadata(identifier: string): Promise<BookMetadataResponse> {
        const response = await fetch(`${API_BASE_URL}/books/lookup/${identifier}`, { method: 'GET' });
        if (!response.ok) throw new Error('Failed to lookup metadata');
        return response.json();
    },

    async searchMetadata(query: string): Promise<BookMetadataResponse[]> {
        const url = new URL(`${API_BASE_URL}/books/search-metadata`);
        url.searchParams.append('q', query);
        const response = await fetch(url.toString(), { method: 'GET' });
        if (!response.ok) throw new Error('Failed to search metadata');
        return response.json();
    }
};
import { invoke } from '@tauri-apps/api/core';
import type { Book, CreateBookPayload } from '../types/book';

export interface PaginatedResponse {
    data: Book[];
    total: number;
}

export const apiClient = {
    async getBooks(limit: number, offset: number, sortBy?: string, sortOrder?: string, search?: string): Promise<PaginatedResponse> {
        try {
            return await invoke<PaginatedResponse>('get_books', {
                limit,
                offset,
                sortBy: sortBy || null,
                sortOrder: sortOrder || null,
                search: search || null
            });
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    async createBook(payload: CreateBookPayload): Promise<Book> {
        try {
            return await invoke<Book>('create_book', { payload });
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    async updateBook(id: string, payload: CreateBookPayload): Promise<Book> {
        try {
            return await invoke<Book>('update_book', { id, payload });
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    async deleteBook(id: string): Promise<void> {
        try {
            await invoke('delete_book', { id });
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
};
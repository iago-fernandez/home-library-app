import { invoke } from '@tauri-apps/api/core';
import type { Book, CreateBookPayload } from '../types/book';

export const apiClient = {
    async getBooks(limit: number, offset: number): Promise<Book[]> {
        try {
            return await invoke<Book[]>('get_books', { limit, offset });
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
    }
};
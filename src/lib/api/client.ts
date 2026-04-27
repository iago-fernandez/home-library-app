import { invoke } from '@tauri-apps/api/core';
import type { Book, CreateBookPayload } from '../types/book';

export const apiClient = {
    async getBooks(): Promise<Book[]> {
        return [];
    },

    async createBook(payload: CreateBookPayload): Promise<Book> {
        try {
            const response = await invoke<Book>('create_book', { payload });
            return response;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
};
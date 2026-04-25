import type { Book, CreateBookPayload } from '../types/book';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const apiClient = {
    async getBooks(): Promise<Book[]> {
        const response = await fetch(`${API_BASE_URL}/books`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch books: ${response.statusText}`);
        }

        return response.json();
    },

    async createBook(payload: CreateBookPayload): Promise<Book> {
        const response = await fetch(`${API_BASE_URL}/books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to create book: ${response.statusText}`);
        }

        return response.json();
    }
};
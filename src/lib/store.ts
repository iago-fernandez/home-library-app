import { writable } from 'svelte/store';
import type { Book, CreateBookPayload } from './types/book';
import { apiClient } from './api/client';

function createBookStore() {
    const { subscribe, set, update } = writable<Book[]>([]);

    return {
        subscribe,
        loadBooks: async () => {
            try {
                const books = await apiClient.getBooks();
                set(books);
            } catch (error) {
                console.error("Failed to load books:", error);
            }
        },
        addBook: async (payload: CreateBookPayload) => {
            const tempId = crypto.randomUUID();

            const optimisticBook: Book = {
                ...payload,
                id: tempId,
                catalog_number: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as Book;

            update(books => [...books, optimisticBook]);

            try {
                const createdBook = await apiClient.createBook(payload);
                update(books => books.map(book => book.id === tempId ? createdBook : book));
            } catch (error) {
                console.error("Network synchronization failed:", error);
                update(books => books.filter(book => book.id !== tempId));
                throw error;
            }
        }
    };
}

export const bookStore = createBookStore();
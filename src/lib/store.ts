import { writable } from 'svelte/store';
import type { Book, CreateBookPayload } from './types/book';
import { apiClient } from './api/client';

function createBookStore() {
    const { subscribe, set, update } = writable<Book[]>([]);
    let currentOffset = 0;
    const LIMIT = 100;
    let hasMore = true;
    let isFetching = false;

    return {
        subscribe,
        loadBooks: async () => {
            if (isFetching || !hasMore) return;

            isFetching = true;
            try {
                const books = await apiClient.getBooks(LIMIT, currentOffset);

                if (books.length < LIMIT) {
                    hasMore = false;
                }

                update(currentBooks => [...currentBooks, ...books]);
                currentOffset += LIMIT;
            } catch (error) {
                console.error(error);
            } finally {
                isFetching = false;
            }
        },
        resetAndLoad: async () => {
            set([]);
            currentOffset = 0;
            hasMore = true;
            isFetching = false;
            await bookStore.loadBooks();
        },
        addBook: async (payload: CreateBookPayload) => {
            const tempId = crypto.randomUUID();

            const optimisticBook: Book = {
                ...payload,
                id: tempId,
            } as Book;

            update(books => [...books, optimisticBook]);

            try {
                const createdBook = await apiClient.createBook(payload);
                update(books => books.map(book => book.id === tempId ? createdBook : book));
            } catch (error) {
                console.error(error);
                update(books => books.filter(book => book.id !== tempId));
                throw error;
            }
        }
    };
}

export const bookStore = createBookStore();
import { writable } from 'svelte/store';
import type { Book, CreateBookPayload } from './types/book';
import { apiClient } from './api/client';

function createBookStore() {
    const { subscribe, set, update } = writable<Book[]>([]);
    const totalBooks = writable<number>(0);

    let currentOffset = 0;
    const LIMIT = 100;
    let hasMore = true;
    let isFetching = false;

    return {
        subscribe,
        total: { subscribe: totalBooks.subscribe },
        loadBooks: async () => {
            if (isFetching || !hasMore) return;

            isFetching = true;
            try {
                const response = await apiClient.getBooks(LIMIT, currentOffset);

                totalBooks.set(response.total);

                if (response.data.length < LIMIT) {
                    hasMore = false;
                }

                update(currentBooks => [...currentBooks, ...response.data]);
                currentOffset += LIMIT;
            } catch (error) {
                console.error(error);
            } finally {
                isFetching = false;
            }
        },
        resetAndLoad: async () => {
            set([]);
            totalBooks.set(0);
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
            totalBooks.update(n => n + 1);

            try {
                const createdBook = await apiClient.createBook(payload);
                update(books => books.map(book => book.id === tempId ? createdBook : book));
            } catch (error) {
                console.error(error);
                update(books => books.filter(book => book.id !== tempId));
                totalBooks.update(n => n - 1);
                throw error;
            }
        }
    };
}

export const bookStore = createBookStore();
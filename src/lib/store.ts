import { writable } from 'svelte/store';
import type { Book, CreateBookPayload } from './types/book';
import { apiClient } from './api/client';

function createBookStore() {
    const { subscribe, set, update } = writable<Book[]>([]);
    const totalBooks = writable<number>(0);
    const selectedBookId = writable<string | null>(null);

    let currentOffset = 0;
    const LIMIT = 100;
    let hasMore = true;
    let isFetching = false;

    return {
        subscribe,
        total: { subscribe: totalBooks.subscribe },
        selectedId: {
            subscribe: selectedBookId.subscribe,
            set: selectedBookId.set
        },
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
            selectedBookId.set(null);
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
        },
        updateBook: async (id: string, payload: CreateBookPayload) => {
            let previousBook: Book | undefined;

            update(books => {
                const index = books.findIndex(b => b.id === id);
                if (index !== -1) {
                    previousBook = { ...books[index] };
                    const updatedBooks = [...books];
                    updatedBooks[index] = { ...previousBook, ...payload };
                    return updatedBooks;
                }
                return books;
            });

            try {
                const updatedBook = await apiClient.updateBook(id, payload);
                update(books => books.map(book => book.id === id ? updatedBook : book));
            } catch (error) {
                console.error(error);
                if (previousBook) {
                    update(books => books.map(book => book.id === id ? previousBook! : book));
                }
                throw error;
            }
        },
        deleteBook: async (id: string) => {
            let removedBook: Book | undefined;

            update(books => {
                const index = books.findIndex(b => b.id === id);
                if (index !== -1) {
                    removedBook = books[index];
                    const newBooks = [...books];
                    newBooks.splice(index, 1);
                    return newBooks;
                }
                return books;
            });

            totalBooks.update(n => Math.max(0, n - 1));
            selectedBookId.set(null);

            try {
                await apiClient.deleteBook(id);
            } catch (error) {
                console.error(error);
                if (removedBook) {
                    update(books => [...books, removedBook!]);
                    totalBooks.update(n => n + 1);
                }
                throw error;
            }
        }
    };
}

export const bookStore = createBookStore();
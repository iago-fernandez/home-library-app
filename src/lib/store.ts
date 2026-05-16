import { writable, get } from 'svelte/store';
import type { Book, CreateBookPayload, UpdateBookPayload } from './types/book';
import { apiClient } from './api/client';

function createBookStore() {
    const { subscribe, set, update } = writable<Book[]>([]);
    const totalBooks = writable<number>(0);
    const selectedBookId = writable<string | null>(null);
    const selectedIdsList = writable<string[]>([]);

    const sortParam = writable<string | undefined>(undefined);
    const orderParam = writable<'asc' | 'desc' | undefined>(undefined);
    const filterQuery = writable<string | undefined>(undefined);

    const localSearchActive = writable<boolean>(false);
    const multiSelectMode = writable<boolean>(false);

    let currentOffset = 0;
    const LIMIT = 100;
    let hasMore = true;
    let isFetching = false;
    let currentRequestId = 0;

    return {
        subscribe,
        total: { subscribe: totalBooks.subscribe },
        selectedId: {
            subscribe: selectedBookId.subscribe,
            set: selectedBookId.set
        },
        selectedIds: {
            subscribe: selectedIdsList.subscribe,
            set: selectedIdsList.set
        },
        sortConfig: { subscribe: sortParam.subscribe },
        orderConfig: { subscribe: orderParam.subscribe },
        filterConfig: { subscribe: filterQuery.subscribe },
        localSearchActive,
        multiSelectMode,

        toggleLocalSearch: () => localSearchActive.update(v => !v),

        toggleMultiSelectMode: () => {
            multiSelectMode.update(active => {
                if (active) {
                    selectedIdsList.set([]);
                }
                return !active;
            });
        },

        loadBooks: async () => {
            if (isFetching || !hasMore) return;

            isFetching = true;
            currentRequestId += 1;
            const reqId = currentRequestId;
            const requestedOffset = currentOffset;
            currentOffset += LIMIT;

            try {
                const currentQuery = get(filterQuery);

                const response = await apiClient.getBooks(
                    LIMIT,
                    requestedOffset,
                    get(sortParam),
                    get(orderParam),
                    currentQuery
                );

                if (reqId !== currentRequestId) return;

                let currentArrayLength = 0;

                update(currentBooks => {
                    const combined = [...currentBooks, ...response.data];
                    const uniqueBooks = combined.filter((book, index, self) =>
                        index === self.findIndex((b) => b.id === book.id)
                    );
                    currentArrayLength = uniqueBooks.length;
                    return uniqueBooks;
                });

                if (response.data.length < LIMIT) {
                    hasMore = false;
                    totalBooks.set(currentArrayLength);
                } else {
                    totalBooks.set(response.total);
                }

            } catch (error) {
                console.error(error);
                if (reqId === currentRequestId) {
                    currentOffset -= LIMIT;
                }
            } finally {
                if (reqId === currentRequestId) {
                    isFetching = false;
                }
            }
        },

        resetAndLoad: async () => {
            currentRequestId += 1;
            set([]);
            totalBooks.set(0);
            selectedBookId.set(null);
            selectedIdsList.set([]);
            currentOffset = 0;
            hasMore = true;
            isFetching = false;

            await bookStore.loadBooks();
        },

        applySort: async (column: string | undefined, order: 'asc' | 'desc' | undefined) => {
            sortParam.set(column);
            orderParam.set(order);
            await bookStore.resetAndLoad();
        },

        applyFilters: async (queryJson: string | undefined) => {
            filterQuery.set(queryJson);
            await bookStore.resetAndLoad();
        },

        addBook: async (payload: CreateBookPayload) => {
            const tempId = crypto.randomUUID();

            const optimisticBook: Book = {
                ...payload,
                id: tempId,
            } as Book;

            update(books => [optimisticBook, ...books]);
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

        updateBooksBatch: async (ids: string[], partialPayload: Record<string, any>) => {
            const previousState = get({ subscribe });

            update(state => state.map(book =>
                ids.includes(book.id) ? { ...book, ...partialPayload } : book
            ));

            try {
                const updatePromises = ids.map(id => apiClient.patchBook(id, partialPayload));
                const updatedBooks = await Promise.all(updatePromises);

                update(state => {
                    const newState = [...state];
                    updatedBooks.forEach(updatedBook => {
                        const index = newState.findIndex(b => b.id === updatedBook.id);
                        if (index !== -1) {
                            newState[index] = updatedBook;
                        }
                    });
                    return newState;
                });
            } catch (error) {
                set(previousState);
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
            selectedIdsList.update(ids => ids.filter(i => i !== id));

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
        },

        deleteBooksBatch: async (ids: string[]) => {
            let removedBooks: Book[] = [];

            update(books => {
                removedBooks = books.filter(b => ids.includes(b.id));
                return books.filter(b => !ids.includes(b.id));
            });

            totalBooks.update(n => Math.max(0, n - ids.length));
            selectedBookId.set(null);
            selectedIdsList.set([]);

            try {
                await apiClient.deleteBooksBatch(ids);
            } catch (error) {
                console.error(error);
                if (removedBooks.length > 0) {
                    update(books => [...books, ...removedBooks]);
                    totalBooks.update(n => n + removedBooks.length);
                }
                throw error;
            }
        },

        toggleSelection: (id: string) => {
            selectedIdsList.update(ids => {
                if (ids.includes(id)) {
                    return ids.filter(i => i !== id);
                } else {
                    return [...ids, id];
                }
            });
        },

        clearSelection: () => {
            selectedIdsList.set([]);
        }
    };
}

export const bookStore = createBookStore();
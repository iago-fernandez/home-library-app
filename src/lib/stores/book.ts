import { writable, get, derived } from 'svelte/store';
import type { Book, CreateBookPayload, UpdateBookPayload } from '../types/book';
import { apiClient } from '../api/client';
import { libraryStore } from './library';

function evaluateAst(book: any, ast: any): boolean {
    if (!ast) return true;
    
    if (ast.type === 'AND') {
        return ast.nodes.every((n: any) => evaluateAst(book, n));
    }
    if (ast.type === 'OR') {
        return ast.nodes.some((n: any) => evaluateAst(book, n));
    }
    if (ast.type === 'NOT') {
        return !evaluateAst(book, ast.node);
    }
    if (ast.type === 'CONDITION') {
        let fieldVal = book[ast.field];
        if (fieldVal === undefined || fieldVal === null) fieldVal = '';
        fieldVal = String(fieldVal);
        
        let target = ast.value;
        const op = ast.operator;
        
        const isCaseSensitive = op.endsWith('_case');
        if (!isCaseSensitive) {
            fieldVal = fieldVal.toLowerCase();
            target = target.toLowerCase();
        }
        
        const baseOp = isCaseSensitive ? op.replace('_case', '') : op;
        
        switch (baseOp) {
            case '_contains': return fieldVal.includes(target);
            case '_starts': return fieldVal.startsWith(target);
            case '_ends': return fieldVal.endsWith(target);
            case '_eq': return fieldVal === target;
            default: return false;
        }
    }
    return true;
}

function sortBooks(books: Book[], sortBy: string, sortOrder: 'asc' | 'desc'): Book[] {
    return [...books].sort((a: any, b: any) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        
        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';
        
        if (typeof valA === 'string' && typeof valB === 'string') {
            const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
            return sortOrder === 'asc' ? cmp : -cmp;
        }
        
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
}

function createBookStore() {
    const rawBooks = writable<Book[]>([]);
    
    const selectedBookId = writable<string | null>(null);
    const selectedIdsList = writable<string[]>([]);

    const sortParam = writable<string | undefined>(undefined);
    const orderParam = writable<'asc' | 'desc' | undefined>(undefined);
    const filterQuery = writable<string | undefined>(undefined);

    const localSearchActive = writable<boolean>(false);
    const multiSelectMode = writable<boolean>(false);

    let isFetching = false;
    let currentRequestId = 0;
    const isSyncing = writable<boolean>(false);

    // The derived store applies filters and sorting locally!
    const derivedBooks = derived(
        [rawBooks, filterQuery, sortParam, orderParam],
        ([$rawBooks, $filterQuery, $sortParam, $orderParam]) => {
            let result = $rawBooks;
            
            // 1. Filter
            if ($filterQuery) {
                try {
                    const ast = JSON.parse($filterQuery);
                    result = result.filter(book => evaluateAst(book, ast));
                } catch (e) {
                    console.error("Error parsing filter AST", e);
                }
            }
            
            // 2. Sort
            if ($sortParam && $orderParam) {
                result = sortBooks(result, $sortParam, $orderParam);
            }
            
            return result;
        }
    );
    
    const totalBooks = derived(derivedBooks, $derivedBooks => $derivedBooks.length);

    return {
        subscribe: derivedBooks.subscribe,
        total: { subscribe: totalBooks.subscribe },
        isSyncing: { subscribe: isSyncing.subscribe },
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
                if (active) selectedIdsList.set([]);
                return !active;
            });
        },

        loadBooks: async (isReset = false) => {
            if (isFetching && !isReset) return;
            isFetching = true;
            isSyncing.set(true);
            const reqId = ++currentRequestId;

            if (isReset) {
                rawBooks.set([]);
            }

            try {
                // Chunked loading to stream the data into RAM
                let currentOffset = 0;
                const chunkLimit = 5000;
                let hasMore = true;
                
                // Fetch the first 100 items for instant UI render
                const initialResponse = await apiClient.getBooks(
                    100,
                    0,
                    undefined,
                    undefined,
                    undefined,
                    get(libraryStore).activeLibraryId || undefined
                );
                
                if (reqId !== currentRequestId) return;
                rawBooks.set(initialResponse.data);
                
                if (initialResponse.data.length === 0 || initialResponse.data.length >= initialResponse.total) {
                    hasMore = false;
                } else {
                    currentOffset = initialResponse.data.length;
                }

                // Background sync loop
                while (hasMore && reqId === currentRequestId) {
                    const response = await apiClient.getBooks(
                        chunkLimit,
                        currentOffset,
                        undefined,
                        undefined,
                        undefined,
                        get(libraryStore).activeLibraryId || undefined
                    );
                    
                    if (reqId !== currentRequestId) break;
                    
                    rawBooks.update(current => {
                        const combined = [...current, ...response.data];
                        return combined.filter((book, index, self) =>
                            index === self.findIndex((b) => b.id === book.id)
                        );
                    });
                    
                    if (currentOffset + response.data.length >= response.total || response.data.length === 0) {
                        hasMore = false;
                    } else {
                        currentOffset += response.data.length;
                    }
                }
            } catch (error) {
                console.error("Sync error:", error);
            } finally {
                if (reqId === currentRequestId) {
                    isFetching = false;
                    isSyncing.set(false);
                }
            }
        },

        resetAndLoad: async () => {
            // Local-first architecture doesn't need to refetch on sort/filter!
            // The derived store handles it automatically in 0ms!
        },

        purge: () => {
            currentRequestId += 1;
            rawBooks.set([]);
            selectedBookId.set(null);
            selectedIdsList.set([]);
            isFetching = false;
            isSyncing.set(false);
        },

        applySort: async (column: string | undefined, order: 'asc' | 'desc' | undefined) => {
            sortParam.set(column);
            orderParam.set(order);
        },

        applyFilters: async (queryJson: string | undefined) => {
            filterQuery.set(queryJson);
        },

        addBook: async (payload: CreateBookPayload) => {
            const tempId = crypto.randomUUID();
            const optimisticBook: Book = { ...payload, id: tempId } as Book;
            rawBooks.update(books => [optimisticBook, ...books]);

            try {
                const createdBook = await apiClient.createBook(payload);
                rawBooks.update(books => books.map(book => book.id === tempId ? createdBook : book));
            } catch (error) {
                console.error(error);
                rawBooks.update(books => books.filter(book => book.id !== tempId));
                throw error;
            }
        },

        updateBook: async (id: string, payload: CreateBookPayload) => {
            let previousBook: Book | undefined;
            rawBooks.update(books => {
                const index = books.findIndex(b => b.id === id);
                if (index !== -1) {
                    previousBook = books[index];
                    const updated = [...books];
                    updated[index] = { ...previousBook, ...payload };
                    return updated;
                }
                return books;
            });

            try {
                const updatedBook = await apiClient.updateBook(id, payload);
                rawBooks.update(books => {
                    const index = books.findIndex(b => b.id === id);
                    if (index !== -1) {
                        const newBooks = [...books];
                        newBooks[index] = updatedBook;
                        return newBooks;
                    }
                    return books;
                });
            } catch (error) {
                console.error(error);
                if (previousBook) {
                    rawBooks.update(books => {
                        const index = books.findIndex(b => b.id === id);
                        if (index !== -1) {
                            const rb = [...books];
                            rb[index] = previousBook as Book;
                            return rb;
                        }
                        return books;
                    });
                }
                throw error;
            }
        },

        patchBook: async (id: string, payload: Record<string, any>) => {
            let previousBook: Book | undefined;
            rawBooks.update(books => {
                const index = books.findIndex(b => b.id === id);
                if (index !== -1) {
                    previousBook = books[index];
                    const updated = [...books];
                    updated[index] = { ...previousBook, ...payload };
                    return updated;
                }
                return books;
            });

            try {
                const updatedBook = await apiClient.patchBook(id, payload);
                rawBooks.update(books => {
                    const index = books.findIndex(b => b.id === id);
                    if (index !== -1) {
                        const newBooks = [...books];
                        newBooks[index] = updatedBook;
                        return newBooks;
                    }
                    return books;
                });
            } catch (error) {
                if (previousBook) {
                    rawBooks.update(books => {
                        const index = books.findIndex(b => b.id === id);
                        if (index !== -1) {
                            const rb = [...books];
                            rb[index] = previousBook as Book;
                            return rb;
                        }
                        return books;
                    });
                }
                throw error;
            }
        },

        updateBooksBatch: async (ids: string[], payload: Record<string, any>) => {
            const promises = ids.map(id => {
                let previousBook: Book | undefined;
                rawBooks.update(books => {
                    const index = books.findIndex(b => b.id === id);
                    if (index !== -1) {
                        previousBook = books[index];
                        const updated = [...books];
                        updated[index] = { ...previousBook, ...payload };
                        return updated;
                    }
                    return books;
                });
                
                return apiClient.patchBook(id, payload).then(updatedBook => {
                    rawBooks.update(books => {
                        const index = books.findIndex(b => b.id === id);
                        if (index !== -1) {
                            const newBooks = [...books];
                            newBooks[index] = updatedBook;
                            return newBooks;
                        }
                        return books;
                    });
                }).catch(error => {
                    if (previousBook) {
                        rawBooks.update(books => {
                            const index = books.findIndex(b => b.id === id);
                            if (index !== -1) {
                                const rb = [...books];
                                rb[index] = previousBook as Book;
                                return rb;
                            }
                            return books;
                        });
                    }
                    throw error;
                });
            });
            await Promise.all(promises);
        },

        deleteBook: async (id: string) => {
            let removedBook: Book | undefined;
            let removedIndex = -1;
            rawBooks.update(books => {
                removedIndex = books.findIndex(b => b.id === id);
                if (removedIndex !== -1) {
                    removedBook = books[removedIndex];
                    return books.filter(b => b.id !== id);
                }
                return books;
            });

            try {
                await apiClient.deleteBook(id);
                selectedBookId.update(current => current === id ? null : current);
                selectedIdsList.update(current => current.filter(cid => cid !== id));
            } catch (error) {
                console.error(error);
                if (removedBook && removedIndex !== -1) {
                    rawBooks.update(books => {
                        const rb = [...books];
                        rb.splice(removedIndex, 0, removedBook as Book);
                        return rb;
                    });
                }
                throw error;
            }
        },

        deleteBooksBatch: async (ids: string[]) => {
            let removedBooks: Book[] = [];
            rawBooks.update(books => {
                removedBooks = books.filter(b => ids.includes(b.id));
                return books.filter(b => !ids.includes(b.id));
            });

            try {
                await apiClient.deleteBooksBatch(ids);
                selectedBookId.update(current => current && ids.includes(current) ? null : current);
                selectedIdsList.update(current => current.filter(cid => !ids.includes(cid)));
            } catch (error) {
                console.error(error);
                rawBooks.update(books => [...books, ...removedBooks]);
                throw error;
            }
        },

        clearSelection: () => {
            selectedBookId.set(null);
            selectedIdsList.set([]);
        }
    };
}

export const bookStore = createBookStore();

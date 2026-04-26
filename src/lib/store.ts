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
        loadMockData: () => {
            const mockBooks: Book[] = [
                {
                    id: crypto.randomUUID(),
                    catalog_number: 1,
                    isbn_13: "978-0131103627",
                    isbn_10: "0131103628",
                    open_library_id: null,
                    oclc_number: null,
                    title: "The C Programming Language",
                    subtitle: null,
                    original_title: null,
                    authors: ["Brian W. Kernighan", "Dennis M. Ritchie"],
                    translators: null,
                    illustrators: null,
                    publisher: "Prentice Hall",
                    publish_date: "1988-03-22",
                    original_publish_date: "1978",
                    edition_number: 2,
                    printing_number: null,
                    original_edition: null,
                    is_first_edition: false,
                    collection_name: null,
                    volume_in_collection: null,
                    series_name: null,
                    volume_in_series: null,
                    book_format: "Paperback",
                    page_count: 272,
                    dimensions: null,
                    weight: null,
                    language: "English",
                    original_language: "English",
                    subjects: ["Programming", "C"],
                    genres: ["Textbook"],
                    target_audience: "Developers",
                    description: null,
                    table_of_contents: null,
                    cover_url: null,
                    purchase_date: null,
                    purchase_price: null,
                    store_or_vendor: null,
                    acquisition_type: null,
                    location_property: "Main House",
                    location_room: "Office",
                    location_bookcase: "Technical",
                    location_shelf: "Top",
                    location_position: "1",
                    condition_state: "Good",
                    personal_notes: null,
                    read_status: "Read",
                    rating: 5,
                    date_started: null,
                    date_finished: null,
                    reading_notes: null,
                    is_loaned: false,
                    loaned_to: null,
                    loan_date: null,
                    expected_return_date: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];
            set(mockBooks);
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
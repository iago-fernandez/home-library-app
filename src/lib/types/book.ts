export interface Book {
    id: string;
    catalog_number: number;
    isbn_13: string | null;
    isbn_10: string | null;
    open_library_id: string | null;
    oclc_number: string | null;
    title: string;
    subtitle: string | null;
    original_title: string | null;
    authors: string[];
    translators: string[] | null;
    illustrators: string[] | null;
    publisher: string | null;
    publish_date: string | null;
    original_publish_date: string | null;
    edition_number: number | null;
    printing_number: number | null;
    original_edition: string | null;
    is_first_edition: boolean | null;
    collection_name: string | null;
    volume_in_collection: number | null;
    series_name: string | null;
    volume_in_series: number | null;
    book_format: string | null;
    page_count: number | null;
    dimensions: string | null;
    weight: string | null;
    language: string | null;
    original_language: string | null;
    subjects: string[] | null;
    genres: string[] | null;
    target_audience: string | null;
    description: string | null;
    table_of_contents: string | null;
    cover_url: string | null;
    purchase_date: string | null;
    purchase_price: number | null;
    store_or_vendor: string | null;
    acquisition_type: string | null;
    location_property: string | null;
    location_room: string | null;
    location_bookcase: string | null;
    location_shelf: string | null;
    location_position: string | null;
    condition_state: string | null;
    personal_notes: string | null;
    read_status: string | null;
    rating: number | null;
    date_started: string | null;
    date_finished: string | null;
    reading_notes: string | null;
    is_loaned: boolean | null;
    loaned_to: string | null;
    loan_date: string | null;
    expected_return_date: string | null;
    created_at: string;
    updated_at: string;
}

export type CreateBookPayload = Omit<Book, 'id' | 'catalog_number' | 'created_at' | 'updated_at'>;

export interface PaginatedResponse {
    data: Book[];
    total: number;
}

export interface BookMetadataResponse {
    isbn: string | null;
    title: string | null;
    authors: string[] | null;
    publish_date: string | null;
    page_count: number | null;
    cover_url: string | null;
}
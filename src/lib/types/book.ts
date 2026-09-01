export interface Book {
    id: string;
    library_id: string;
    catalog_number: number;
    isbn_13?: string;
    isbn_10?: string;
    open_library_id?: string;
    oclc_number?: string;
    title: string;
    subtitle?: string;
    original_title?: string;
    authors: string[];
    translators?: string[];
    illustrators?: string[];
    publisher?: string;
    publish_date?: string;
    original_publish_date?: string;
    edition?: string;
    edition_number?: number;
    printing_number?: number;
    original_edition?: string;
    is_first_edition?: boolean;
    collection_name?: string;
    volume_in_collection?: number;
    series_name?: string;
    volume_in_series?: number;
    book_format?: string;
    page_count?: number;
    dimension_length?: number;
    dimension_width?: number;
    dimension_depth?: number;
    weight?: number;
    language?: string;
    original_language?: string;
    subjects?: string[];
    genres?: string[];
    target_audience?: string;
    description?: string;
    table_of_contents?: string;
    cover_url?: string;
    purchase_date?: string;
    purchase_price?: number;
    store_or_vendor?: string;
    acquisition_type?: string;
    location_property?: string;
    location_room?: string;
    location_bookcase?: string;
    location_shelf?: string;
    location_position?: number;
    condition_state?: string;
    public_notes?: string;
    personal_notes?: string;
    read_status?: string;
    rating?: number;
    date_started?: string;
    date_finished?: string;
    reading_notes?: string;
    is_loaned?: boolean;
    loaned_to?: string;
    loan_date?: string;
    expected_return_date?: string;
    created_at: string;
    updated_at: string;
}

export type CreateBookPayload = Omit<Book, 'id' | 'catalog_number' | 'created_at' | 'updated_at'> & { library_id?: string };

export type UpdateBookPayload = Partial<CreateBookPayload>;

export interface PaginatedResponse {
    data: Book[];
    total: number;
}

export interface BookMetadataResponse {
    isbn?: string;
    title?: string;
    authors?: string[];
    publish_date?: string;
    page_count?: number;
    cover_url?: string;
    subtitle?: string;
    publishers?: string[];
    physical_format?: string;
    weight?: number;
    dimension_length?: number;
    dimension_width?: number;
    dimension_depth?: number;
    subjects?: string[];
    languages?: string[];
}
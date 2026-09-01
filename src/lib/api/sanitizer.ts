import type { CreateBookPayload } from '../types/book';

export function sanitizeBookPayload(payload: any): any {
    const cleaned: any = {};

    const stringFields = [
        'library_id', 'isbn_13', 'isbn_10', 'open_library_id', 'oclc_number', 'title', 'subtitle',
        'original_title', 'publisher', 'edition', 'edition_number', 'original_edition', 'collection_name', 'series_name', 'book_format',
        'language', 'original_language', 'target_audience',
        'description', 'table_of_contents', 'cover_url', 'store_or_vendor',
        'acquisition_type', 'location_property', 'location_room', 'location_bookcase',
        'location_shelf', 'condition_state', 'public_notes', 'personal_notes', 'read_status',
        'reading_notes', 'loaned_to'
    ];

    const dateFields = [
        'publish_date', 'original_publish_date', 'purchase_date',
        'date_started', 'date_finished', 'loan_date', 'expected_return_date'
    ];

    const numberFields = [
        'volume_in_collection', 'volume_in_series', 'page_count',
        'purchase_price', 'location_position', 'rating', 'printing_number', 'weight', 'dimension_length', 'dimension_width', 'dimension_depth'
    ];

    const arrayFields = ['authors', 'translators', 'illustrators', 'subjects', 'genres'];

    for (const field of stringFields) {
        if (typeof payload[field] === 'string') {
            const val = payload[field].trim();
            if (val !== '') {
                if (field === 'isbn_13' || field === 'isbn_10') {
                    cleaned[field] = val.replace(/[\s-]/g, '');
                } else {
                    cleaned[field] = val;
                }
            }
        }
    }

    for (const field of dateFields) {
        let val = payload[field];
        if (typeof val === 'number') val = String(val);
        if (val && typeof val === 'string' && val.trim() !== '') {
            const date = new Date(val);
            if (!isNaN(date.getTime())) {
                cleaned[field] = date.toISOString().split('T')[0];
            }
        }
    }

    for (const field of numberFields) {
        const val = payload[field];
        if (val !== undefined && val !== null && val !== '') {
            const num = Number(val);
            if (!isNaN(num)) {
                cleaned[field] = num;
            }
        }
    }

    for (const field of arrayFields) {
        const val = payload[field];
        if (Array.isArray(val)) {
            const cleanArray = val
                .map(item => (typeof item === 'string' ? item.trim() : item))
                .filter(item => item !== '');

            if (cleanArray.length > 0) {
                cleaned[field] = cleanArray;
            }
        }
    }

    if (typeof payload.is_first_edition === 'boolean') cleaned.is_first_edition = payload.is_first_edition;
    if (typeof payload.is_loaned === 'boolean') cleaned.is_loaned = payload.is_loaned;

    return cleaned;
}
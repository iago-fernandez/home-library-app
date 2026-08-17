<script lang="ts">
    import type { CreateBookPayload, Book } from '$lib/types/book';
    import { t } from '$lib/i18n';
    import CollapsibleFieldset from './CollapsibleFieldset.svelte';
    import { apiClient } from '$lib/api/client';
    import AutoExpandTextarea from './AutoExpandTextarea.svelte';
    import ChipInput from './ChipInput.svelte';
    import BookCover from './BookCover.svelte';
    import DropdownSelect from './DropdownSelect.svelte';
    import BarcodeScannerModal from './BarcodeScannerModal.svelte';
    import CameraCaptureModal from './CameraCaptureModal.svelte';
    import { Search, DownloadCloud, UploadCloud, Camera } from 'lucide-svelte';

    export let initialData: Book | null = null;
    export let onCancel: () => void;
    export let onSubmit: (payload: CreateBookPayload, imageFile?: File) => void;

    let isLookingUp = false;
    let fetchId = '';
    let fetchError = '';
    let showBarcodeScanner = false;
    let showCameraCapture = false;

    let formData: Partial<CreateBookPayload> = getInitialFormData(initialData);
    let selectedImageFile: File | undefined = undefined;
    let imagePreviewUrl: string = formData.cover_url || '';
    let fileInputRef: HTMLInputElement;

    let errors: Record<string, string> = {};

    function validateForm(): boolean {
        errors = {};
        if (!formData.title?.trim()) {
            errors.title = $t.form?.validationRequiredTitle || 'Title is required';
        }
        if (!formData.authors || formData.authors.length === 0) {
            errors.authors = $t.form?.validationRequiredAuthor || 'At least one author is required';
        }
        // Basic type checks
        // Positive Number checks
        const positiveFields = ['page_count', 'volume_in_collection', 'volume_in_series', 'location_position', 'edition_number'];
        positiveFields.forEach(field => {
            if (formData[field as keyof CreateBookPayload] !== undefined && (formData[field as keyof CreateBookPayload] as number) < 0) {
                errors[field] = $t.form?.validationPositiveNumber || 'Must be a positive number';
            }
        });

        // Rating check
        if (formData.rating !== undefined && (formData.rating < 0 || formData.rating > 10)) {
            errors.rating = $t.form?.validationRating || 'Rating must be between 0 and 10';
        }

        // ISBN check
        if (formData.isbn_13 && formData.isbn_13.replace(/-/g, '').length !== 13) {
            errors.isbn_13 = $t.form?.validationIsbn || 'Invalid ISBN format';
        }
        if (formData.isbn_10 && formData.isbn_10.replace(/-/g, '').length !== 10) {
            errors.isbn_10 = $t.form?.validationIsbn || 'Invalid ISBN format';
        }

        // Past date checks
        const dateFields = ['publish_date', 'original_publish_date', 'purchase_date', 'date_started', 'date_finished'];
        const today = new Date().toISOString().split('T')[0];
        dateFields.forEach(field => {
            const dateVal = formData[field as keyof CreateBookPayload];
            if (dateVal && typeof dateVal === 'string' && dateVal > today) {
                errors[field] = $t.form?.validationPastDate || 'Date cannot be in the future';
            }
        });
        return Object.keys(errors).length === 0;
    }

    function getInitialFormData(data: Book | null): Partial<CreateBookPayload> {
        if (data) {
            return {
                ...data,
                authors: data.authors || [],
                translators: data.translators || [],
                illustrators: data.illustrators || [],
                subjects: data.subjects || [],
                genres: data.genres || []
            };
        }
        return {
            title: '', subtitle: '', original_title: '',
            authors: [], translators: [], illustrators: [],
            publisher: '', publish_date: '', original_publish_date: '',
            isbn_13: '', isbn_10: '', open_library_id: '', oclc_number: '',
            edition: '', edition_number: undefined, printing_number: '', original_edition: '', is_first_edition: false,
            collection_name: '', volume_in_collection: undefined, series_name: '', volume_in_series: undefined,
            book_format: '', page_count: undefined, dimensions: '', weight: '',
            language: '', original_language: '',
            subjects: [], genres: [], target_audience: '', description: '', table_of_contents: '',
            cover_url: '',
            purchase_date: '', purchase_price: undefined, store_or_vendor: '', acquisition_type: '',
            location_property: '', location_room: '', location_bookcase: '', location_shelf: '', location_position: undefined,
            condition_state: '', personal_notes: '',
            read_status: 'unread', rating: undefined, date_started: '', date_finished: '', reading_notes: '',
            is_loaned: false, loaned_to: '', loan_date: '', expected_return_date: ''
        };
    }

    async function handleAutoFill() {
        if (!fetchId) return;

        isLookingUp = true;
        fetchError = '';
        try {
            const queryParam = fetchId.trim();
            const cleanQuery = queryParam.replace(/-/g, '').replace(/\s/g, '');

            const metadata = await apiClient.lookupMetadata(queryParam);

            if (!metadata.title && !metadata.authors) {
                fetchError = $t.form.fetchErrorEmpty;
            }

            formData.title = metadata.title || '';
            formData.subtitle = metadata.subtitle || '';
            formData.page_count = metadata.page_count || undefined;
            formData.book_format = metadata.physical_format || '';
            formData.weight = metadata.weight || '';
            formData.dimensions = metadata.dimensions || '';

            if (metadata.publish_date) {
                const parsedDate = new Date(metadata.publish_date);
                if (!isNaN(parsedDate.getTime())) {
                    formData.publish_date = parsedDate.toISOString().split('T')[0];
                }
            }

            if (metadata.cover_url) {
                formData.cover_url = metadata.cover_url;
                imagePreviewUrl = metadata.cover_url;
                selectedImageFile = undefined;
            }

            if (metadata.authors) formData.authors = [...new Set([...metadata.authors])];
            if (metadata.publishers && metadata.publishers.length > 0) formData.publisher = metadata.publishers[0];
            if (metadata.subjects) formData.subjects = [...new Set([...metadata.subjects])];
            if (metadata.languages && metadata.languages.length > 0) formData.language = metadata.languages[0];

            const upperQuery = cleanQuery.toUpperCase();
            if (upperQuery.startsWith('OL')) {
                formData.open_library_id = queryParam;
            } else if (upperQuery.startsWith('OCLC') || (cleanQuery.length !== 10 && cleanQuery.length !== 13)) {
                formData.oclc_number = queryParam.replace(/oclc/i, '');
            } else if (cleanQuery.length === 10) {
                formData.isbn_10 = queryParam;
            } else if (cleanQuery.length === 13) {
                formData.isbn_13 = queryParam;
            }

        } catch (error) {
            console.error(error);
        } finally {
            isLookingUp = false;
        }
    }

    function handleBarcodeScanned(event: CustomEvent<string>) {
        fetchId = event.detail;
        showBarcodeScanner = false;
        handleAutoFill();
    }

    function handleFileSelection(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            selectedImageFile = target.files[0];
            imagePreviewUrl = URL.createObjectURL(selectedImageFile);
            formData.cover_url = '';
        }
    }

    function handleCameraCapture(event: CustomEvent<File>) {
        selectedImageFile = event.detail;
        imagePreviewUrl = URL.createObjectURL(selectedImageFile);
        formData.cover_url = '';
    }

    function triggerFileInput() {
        fileInputRef.click();
    }

    function handleSubmit() {
        if (validateForm()) {
            onSubmit(formData as CreateBookPayload, selectedImageFile);
        } else {
            // Scroll to top to see errors if any
            const firstError = document.querySelector('.input-row.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    function handleInput(event: Event) {
        const target = event.target as HTMLElement;
        const id = target.id;
        if (id && errors[id]) {
            delete errors[id];
            errors = { ...errors };
        } else {
            // Support for components like ChipInput or DropdownSelect that might not emit standard input events with ids,
            // or we might need to handle them differently, but for standard inputs this bubbles up perfectly.
            // For ChipInput, authors is handled by its own bind. We can just clear it if we detect changes.
        }
    }

    // Reactive watcher for special custom components that might not bubble Native events nicely:
    $: if (formData.authors && formData.authors.length > 0 && errors.authors) {
        delete errors.authors;
        errors = { ...errors };
    }
</script>

<BarcodeScannerModal bind:isOpen={showBarcodeScanner} on:scan={handleBarcodeScanned} />
<CameraCaptureModal bind:isOpen={showCameraCapture} on:capture={handleCameraCapture} />

<form class="book-form" novalidate on:submit|preventDefault={handleSubmit} on:input={handleInput}>
    <div class="form-header">
        <h3>{initialData ? $t.form.editBook : $t.form.addNewBook}</h3>
        <div class="header-actions">
            <button type="button" class="btn-cancel" on:click={onCancel}>{$t.common.cancel}</button>
            <button type="submit" class="btn-submit">{$t.common.save}</button>
        </div>
    </div>

    <div class="form-scroll-area">
        <div class="autofill-banner">
            <div class="autofill-header">
                <Search size={18} />
                <h4>{$t.form.autofillBannerTitle || 'Smart Fetch'}</h4>
            </div>
            <p class="autofill-desc">{$t.form.autofillBannerDesc}</p>
            <div class="smart-fetch-container">
                <input
                        type="text"
                        id="smart_fetch_input"
                        bind:value={fetchId}
                        placeholder={$t.form.fetchPlaceholder}
                        class="fetch-input"
                        on:keydown={(e) => e.key === 'Enter' && handleAutoFill()}
                />
                <div class="smart-fetch-actions">
                    <button type="button" class="btn-scan" on:click={() => showBarcodeScanner = true} title={$t.form.scanBarcode}>
                        <Camera size={18} /> {$t.form.scanBarcode}
                    </button>
                    <button type="button" class="btn-autofill" on:click={handleAutoFill} disabled={isLookingUp || !fetchId}>
                        <DownloadCloud size={14} />
                        {isLookingUp ? $t.form.autofillLoading : $t.form.autofill}
                    </button>
                </div>
            </div>
            {#if fetchError}
                <div class="fetch-error-message">{fetchError}</div>
            {/if}
        </div>

        <CollapsibleFieldset id="identifiers" sectionTitle={$t.form.identifiers}>
            <div class="input-row" class:error={!!errors.isbn_13}>
                <label for="isbn_13">{$t.form.isbn13}</label>
                <input type="text" id="isbn_13" bind:value={formData.isbn_13} />
                {#if errors.isbn_13}<span class="error-text">{errors.isbn_13}</span>{/if}
            </div>
            <div class="input-grid">
                <div class="input-row" class:error={!!errors.isbn_10}>
                    <label for="isbn_10">{$t.form.isbn10}</label>
                    <input type="text" id="isbn_10" bind:value={formData.isbn_10} />
                    {#if errors.isbn_10}<span class="error-text">{errors.isbn_10}</span>{/if}
                </div>
                <div class="input-row">
                    <label for="open_library_id">{$t.form.openLibraryId}</label>
                    <input type="text" id="open_library_id" bind:value={formData.open_library_id} />
                </div>
                <div class="input-row">
                    <label for="oclc_number">{$t.form.oclcNumber}</label>
                    <input type="text" id="oclc_number" bind:value={formData.oclc_number} />
                </div>
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="cover_image" sectionTitle={$t.form.coverImage}>
            <div class="cover-upload-container">
                <div class="cover-preview" class:has-image={!!imagePreviewUrl}>
                    <BookCover src={imagePreviewUrl} alt={$t.form.coverPreviewAlt} />
                </div>
                <div class="cover-actions">
                    <input
                            type="file"
                            id="cover_image_file"
                            accept="image/*"
                            capture="environment"
                            bind:this={fileInputRef}
                            on:change={handleFileSelection}
                            style="display: none;"
                    />
                    <div class="cover-buttons-row">
                        <button type="button" class="btn-secondary" on:click={triggerFileInput}>
                            <UploadCloud size={16} /> {$t.form.selectFileOrCamera}
                        </button>
                        <button type="button" class="btn-secondary" on:click={() => showCameraCapture = true}>
                            <Camera size={16} /> {$t.form.takePhoto}
                        </button>
                    </div>
                    <div class="input-row" style="width: 100%;">
                        <label for="cover_url_manual">{$t.form.externalUrl}</label>
                        <input type="url" id="cover_url_manual" bind:value={formData.cover_url} on:input={() => { imagePreviewUrl = formData.cover_url || ''; selectedImageFile = undefined; }} />
                    </div>
                </div>
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="core_metadata" sectionTitle={$t.form.coreMetadata}>
            <div class="input-row" class:error={!!errors.title}>
                <label for="title">{$t.form.title} <span class="required">*</span></label>
                <AutoExpandTextarea id="title" bind:value={formData.title} required={true} autocompleteField="title" />
                {#if errors.title}<span class="error-text">{errors.title}</span>{/if}
            </div>
            <div class="input-row">
                <label for="subtitle">{$t.form.subtitle}</label>
                <AutoExpandTextarea id="subtitle" bind:value={formData.subtitle} autocompleteField="subtitle" />
            </div>
            <div class="input-row">
                <label for="original_title">{$t.form.originalTitle}</label>
                <AutoExpandTextarea id="original_title" bind:value={formData.original_title} autocompleteField="original_title" />
            </div>
            <div class="input-row" class:error={!!errors.authors}>
                <label for="authors">{$t.form.authors} <span class="required">*</span></label>
                <ChipInput id="authors" bind:values={formData.authors} placeholder="..." autocompleteField="authors" />
                {#if errors.authors}<span class="error-text">{errors.authors}</span>{/if}
            </div>
            <div class="input-row">
                <label for="translators">{$t.form.translators}</label>
                <ChipInput id="translators" bind:values={formData.translators} placeholder="..." autocompleteField="translators" />
            </div>
            <div class="input-row">
                <label for="illustrators">{$t.form.illustrators}</label>
                <ChipInput id="illustrators" bind:values={formData.illustrators} placeholder="..." autocompleteField="illustrators" />
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="pub_details" sectionTitle={$t.form.pubDetails}>
            <div class="input-row">
                <label for="publisher">{$t.form.publisher}</label>
                <AutoExpandTextarea id="publisher" bind:value={formData.publisher} autocompleteField="publisher" />
            </div>
            <div class="input-grid">
                <div class="input-row" class:error={!!errors.publish_date}>
                    <label for="publish_date">{$t.form.pubDate}</label>
                    <input type="date" id="publish_date" bind:value={formData.publish_date} />
                    {#if errors.publish_date}<span class="error-text">{errors.publish_date}</span>{/if}
                </div>
                <div class="input-row" class:error={!!errors.original_publish_date}>
                    <label for="original_publish_date">{$t.form.origPubDate}</label>
                    <input type="date" id="original_publish_date" bind:value={formData.original_publish_date} />
                    {#if errors.original_publish_date}<span class="error-text">{errors.original_publish_date}</span>{/if}
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row" class:error={!!errors.edition}>
                    <label for="edition">{$t.form.edition}</label>
                    <input type="text" id="edition" bind:value={formData.edition} />
                    {#if errors.edition}<span class="error-text">{errors.edition}</span>{/if}
                </div>
                <div class="input-row" class:error={!!errors.edition_number}>
                    <label for="edition_number">{$t.form.editionNumber}</label>
                    <input type="number" id="edition_number" bind:value={formData.edition_number} min="1" />
                    {#if errors.edition_number}<span class="error-text">{errors.edition_number}</span>{/if}
                </div>
                <div class="input-row">
                    <label for="printing_number">{$t.form.printingNumber}</label>
                    <input type="text" id="printing_number" bind:value={formData.printing_number} />
                </div>
            </div>
            <div class="input-row">
                <label for="original_edition">{$t.form.origEdition}</label>
                <AutoExpandTextarea id="original_edition" bind:value={formData.original_edition} />
            </div>
            <div class="input-row checkbox-row">
                <input type="checkbox" id="is_first_edition" bind:checked={formData.is_first_edition} />
                <label for="is_first_edition">{$t.form.isFirstEdition}</label>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="collection_name">{$t.form.collectionName}</label>
                    <AutoExpandTextarea id="collection_name" bind:value={formData.collection_name} autocompleteField="collection_name" />
                </div>
                <div class="input-row" class:error={!!errors.volume_in_collection}>
                    <label for="volume_in_collection">{$t.form.volInCollection}</label>
                    <input type="number" id="volume_in_collection" bind:value={formData.volume_in_collection} min="0" />
                    {#if errors.volume_in_collection}<span class="error-text">{errors.volume_in_collection}</span>{/if}
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="series_name">{$t.form.seriesName}</label>
                    <AutoExpandTextarea id="series_name" bind:value={formData.series_name} autocompleteField="series_name" />
                </div>
                <div class="input-row" class:error={!!errors.volume_in_series}>
                    <label for="volume_in_series">{$t.form.volInSeries}</label>
                    <input type="number" id="volume_in_series" bind:value={formData.volume_in_series} min="0" />
                    {#if errors.volume_in_series}<span class="error-text">{errors.volume_in_series}</span>{/if}
                </div>
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="physical_props" sectionTitle={$t.form.physicalProps}>
            <div class="input-grid">
                <div class="input-row">
                    <label for="book_format">{$t.form.bookFormat}</label>
                    <input type="text" id="book_format" bind:value={formData.book_format} />
                </div>
                <div class="input-row" class:error={!!errors.page_count}>
                    <label for="page_count">{$t.form.pageCount}</label>
                    <input type="number" id="page_count" bind:value={formData.page_count} min="0" />
                    {#if errors.page_count}<span class="error-text">{errors.page_count}</span>{/if}
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="dimensions">{$t.form.dimensions}</label>
                    <input type="text" id="dimensions" bind:value={formData.dimensions} />
                </div>
                <div class="input-row">
                    <label for="weight">{$t.form.weight}</label>
                    <input type="text" id="weight" bind:value={formData.weight} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="language">{$t.form.language}</label>
                    <AutoExpandTextarea id="language" bind:value={formData.language} autocompleteField="language" />
                </div>
                <div class="input-row">
                    <label for="original_language">{$t.form.origLanguage}</label>
                    <AutoExpandTextarea id="original_language" bind:value={formData.original_language} autocompleteField="original_language" />
                </div>
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="classification" sectionTitle={$t.form.classification}>
            <div class="input-row">
                <label for="subjects">{$t.form.subjects}</label>
                <ChipInput id="subjects" bind:values={formData.subjects} placeholder="..." autocompleteField="subjects" />
            </div>
            <div class="input-row">
                <label for="genres">{$t.form.genres}</label>
                <ChipInput id="genres" bind:values={formData.genres} placeholder="..." autocompleteField="genres" />
            </div>
            <div class="input-row">
                <label for="target_audience">{$t.form.targetAudience}</label>
                <input type="text" id="target_audience" bind:value={formData.target_audience} />
            </div>
            <div class="input-row">
                <label for="description">{$t.form.description}</label>
                <AutoExpandTextarea id="description" bind:value={formData.description} />
            </div>
            <div class="input-row">
                <label for="table_of_contents">{$t.form.tableOfContents}</label>
                <AutoExpandTextarea id="table_of_contents" bind:value={formData.table_of_contents} />
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="acquisition" sectionTitle={$t.form.acquisition}>
            <div class="input-grid">
                <div class="input-row" class:error={!!errors.purchase_date}>
                    <label for="purchase_date">{$t.form.purchaseDate}</label>
                    <input type="date" id="purchase_date" bind:value={formData.purchase_date} />
                    {#if errors.purchase_date}<span class="error-text">{errors.purchase_date}</span>{/if}
                </div>
                <div class="input-row">
                    <label for="purchase_price">{$t.form.purchasePrice}</label>
                    <input type="number" step="0.01" id="purchase_price" bind:value={formData.purchase_price} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="store_or_vendor">{$t.form.storeOrVendor}</label>
                    <AutoExpandTextarea id="store_or_vendor" bind:value={formData.store_or_vendor} autocompleteField="store_or_vendor" />
                </div>
                <div class="input-row">
                    <label for="acquisition_type">{$t.form.acquisitionType}</label>
                    <input type="text" id="acquisition_type" bind:value={formData.acquisition_type} />
                </div>
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="location" sectionTitle={$t.form.physicalLoc}>
            <div class="input-grid">
                <div class="input-row">
                    <label for="location_property">{$t.form.locationProperty}</label>
                    <AutoExpandTextarea id="location_property" bind:value={formData.location_property} autocompleteField="location_property" />
                </div>
                <div class="input-row">
                    <label for="room">{$t.form.room}</label>
                    <AutoExpandTextarea id="room" bind:value={formData.location_room} autocompleteField="room" />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="bookcase">{$t.form.bookcase}</label>
                    <AutoExpandTextarea id="bookcase" bind:value={formData.location_bookcase} autocompleteField="bookcase" />
                </div>
                <div class="input-row">
                    <label for="location_shelf">{$t.form.shelf}</label>
                    <AutoExpandTextarea id="location_shelf" bind:value={formData.location_shelf} autocompleteField="shelf" />
                </div>
                <div class="input-row" class:error={!!errors.location_position}>
                    <label for="location_position">{$t.form.position}</label>
                    <input type="number" id="location_position" bind:value={formData.location_position} />
                    {#if errors.location_position}<span class="error-text">{errors.location_position}</span>{/if}
                </div>
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="condition" sectionTitle={$t.form.conditionNotes}>
            <div class="input-row">
                <label for="condition_state">{$t.form.conditionState}</label>
                <input type="text" id="condition_state" bind:value={formData.condition_state} />
            </div>
            <div class="input-row">
                <label for="personal_notes">{$t.form.personalNotes}</label>
                <AutoExpandTextarea id="personal_notes" bind:value={formData.personal_notes} />
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="reading" sectionTitle={$t.form.readingProgress}>
            <div class="input-grid">
                <div class="input-row">
                    <label for="read_status">{$t.form.readStatus}</label>
                    <DropdownSelect
                        id="read_status"
                        bind:value={formData.read_status}
                        customClass="form-select"
                        placeholder={$t.common.notSet}
                        options={[
                            { value: 'unread', label: $t.form.statusUnread },
                            { value: 'reading', label: $t.form.statusReading },
                            { value: 'read', label: $t.form.statusRead },
                            { value: 'dnf', label: $t.form.statusDnf }
                        ]}
                    />
                </div>
                <div class="input-row" class:error={!!errors.rating}>
                    <label for="rating">{$t.form.rating}</label>
                    <input type="number" min="0" max="10" id="rating" bind:value={formData.rating} />
                    {#if errors.rating}<span class="error-text">{errors.rating}</span>{/if}
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row" class:error={!!errors.date_started}>
                    <label for="date_started">{$t.form.dateStarted}</label>
                    <input type="date" id="date_started" bind:value={formData.date_started} />
                    {#if errors.date_started}<span class="error-text">{errors.date_started}</span>{/if}
                </div>
                <div class="input-row" class:error={!!errors.date_finished}>
                    <label for="date_finished">{$t.form.dateFinished}</label>
                    <input type="date" id="date_finished" bind:value={formData.date_finished} />
                    {#if errors.date_finished}<span class="error-text">{errors.date_finished}</span>{/if}
                </div>
            </div>
            <div class="input-row">
                <label for="reading_notes">{$t.form.readingNotes}</label>
                <AutoExpandTextarea id="reading_notes" bind:value={formData.reading_notes} />
            </div>
        </CollapsibleFieldset>

        <CollapsibleFieldset id="lending" sectionTitle={$t.form.loanManagement}>
            <div class="input-row checkbox-row">
                <input type="checkbox" id="is_loaned" bind:checked={formData.is_loaned} />
                <label for="is_loaned">{$t.form.isLoaned}</label>
            </div>
            {#if formData.is_loaned}
                <div class="input-row">
                    <label for="loaned_to">{$t.form.loanedTo}</label>
                    <AutoExpandTextarea id="loaned_to" bind:value={formData.loaned_to} autocompleteField="loaned_to" />
                </div>
                <div class="input-grid">
                    <div class="input-row">
                        <label for="loan_date">{$t.form.loanDate}</label>
                        <input type="date" id="loan_date" bind:value={formData.loan_date} />
                    </div>
                    <div class="input-row">
                        <label for="expected_return_date">{$t.form.expectedReturnDate}</label>
                        <input type="date" id="expected_return_date" bind:value={formData.expected_return_date} />
                    </div>
                </div>
            {/if}
        </CollapsibleFieldset>
    </div>
</form>

<style>
    .book-form {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: transparent;
    }

    .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 16px;
    }

    .form-header h3 {
        margin: 0;
        font-size: 16px;
        color: var(--text-main);
    }

    .header-actions {
        display: flex;
        gap: 8px;
    }

    button {
        padding: 6px 12px;
        font-size: 13px;
        cursor: pointer;
        border-radius: 4px;
        border: 1px solid var(--button-border);
    }

    .btn-cancel {
        background-color: var(--button-bg);
        color: var(--text-main);
    }

    .btn-submit {
        background-color: var(--primary-color);
        color: #ffffff;
        border-color: var(--primary-color);
        font-weight: 500;
    }

    .btn-secondary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background-color: var(--button-bg);
        color: var(--text-main);
        border: 1px solid var(--button-border);
        font-weight: 500;
    }

    .btn-secondary:hover {
        background-color: var(--button-hover);
        border-color: var(--accent-color);
    }

    .autofill-banner {
        background-color: var(--bg-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 16px 16px 8px 16px;
        margin-bottom: 24px;
    }

    .autofill-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--primary-color);
        margin-bottom: 16px;
    }

    .autofill-header h4 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
    }

    .autofill-desc {
        margin: 0 0 16px 0;
        font-size: 13px;
        color: var(--text-muted);
    }

    .smart-fetch-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 0;
    }

    .smart-fetch-actions {
        display: flex;
        gap: 8px;
    }

    .btn-scan {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px 16px;
        background-color: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-main);
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
        font-weight: 500;
        flex: 1;
    }

    .btn-scan:hover {
        background-color: var(--bg-color);
        color: var(--primary-color);
        border-color: var(--primary-color);
    }

    .fetch-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--primary-color);
        border-radius: 4px;
        font-size: 13px;
        background-color: var(--panel-bg);
        color: var(--text-main);
    }

    .btn-autofill {
        display: flex;
        align-items: center;
        gap: 6px;
        background-color: var(--primary-color);
        color: #ffffff;
        border: 1px solid var(--primary-hover);
        font-weight: 500;
        white-space: nowrap;
    }

    .btn-autofill:hover:not(:disabled) {
        background-color: var(--primary-hover);
    }

    .btn-autofill:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .form-scroll-area {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 8px;
        padding-left: 4px; /* for box shadow */
        padding-bottom: 4px;
        display: flex;
        flex-direction: column;
        gap: 20px; /* Reduced from 32px */
    }


    .cover-upload-container {
        display: flex;
        gap: 16px;
        align-items: center;
        background-color: var(--panel-bg);
        padding: 12px;
        border-radius: 6px;
        border: 1px solid var(--border-color);
    }

    .cover-preview {
        width: 80px;
        height: 120px;
        background-color: var(--bg-color);
        border-radius: 4px;
        border: 1px dashed var(--accent-color);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
    }

    .cover-preview.has-image {
        border-style: solid;
        border-color: var(--border-color);
    }

    .cover-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        align-items: flex-start;
        width: 100%;
    }

    .cover-buttons-row {
        display: flex;
        gap: 8px;
        width: 100%;
    }

    .cover-buttons-row .btn-secondary {
        flex: 1;
        justify-content: center;
        padding: 8px;
        font-size: 13px;
    }

    .input-row {
        display: block;
        position: relative;
    }

    label {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-main);
    }

    .input-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
    }

    @media (max-width: 768px) {
        .input-grid {
            grid-template-columns: 1fr !important;
        }
    }

    .checkbox-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
    }

    .checkbox-row input[type="checkbox"] {
        width: 16px;
        height: 16px;
        margin: 0;
        cursor: pointer;
    }

    .checkbox-row input[type="checkbox"]:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
        border-radius: 2px;
    }

    .checkbox-row label {
        margin-bottom: 0;
        display: inline-block;
    }

    .input-row.error :global(input),
    .input-row.error :global(textarea),
    .input-row.error :global(.chip-input-container) {
        border-color: #ef4444 !important;
    }

    .error-text {
        color: #ef4444;
        font-size: 12px;
        margin-top: 4px;
        display: block;
        animation: fadeIn 0.2s ease-out;
    }

    .required {
        color: #ef4444;
        margin-left: 2px;
    }

    input:not([type="checkbox"]) {
        width: 100%;
        padding: 8px;
        margin: 0;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        font-family: inherit;
        font-size: 13px;
        box-sizing: border-box;
        background-color: var(--panel-bg);
        color: var(--text-main);
        outline: 2px solid transparent;
        outline-offset: 0px;
        transition: border-color 0.2s, outline-color 0.2s;
        min-height: 35px;
    }

    input:not([type="checkbox"]):focus {
        outline: 2px solid var(--focus-ring);
        outline-offset: 0px;
        border-color: var(--input-focus);
    }

    .fetch-error-message {
        color: var(--danger-color);
        font-size: 13px;
        margin-top: 12px;
        margin-bottom: 0;
        font-weight: 500;
        padding: 8px 12px;
        background-color: color-mix(in srgb, var(--danger-color) 10%, transparent);
        border-radius: 4px;
        border: 1px solid color-mix(in srgb, var(--danger-color) 30%, transparent);
    }
</style>
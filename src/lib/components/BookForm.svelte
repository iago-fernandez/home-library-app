<script lang="ts">
    import type { CreateBookPayload, Book } from '$lib/types/book';
    import { t } from '$lib/i18n';
    import { apiClient } from '$lib/api/client';
    import AutoExpandTextarea from './AutoExpandTextarea.svelte';
    import ChipInput from './ChipInput.svelte';
    import { Search, DownloadCloud, UploadCloud, Camera } from 'lucide-svelte';

    export let initialData: Book | null = null;
    export let onCancel: () => void;
    export let onSubmit: (payload: CreateBookPayload, imageFile?: File) => void;

    let isLookingUp = false;
    let fetchId = '';
    let fetchError = '';

    let formData: Partial<CreateBookPayload> = getInitialFormData(initialData);
    let selectedImageFile: File | undefined = undefined;
    let imagePreviewUrl: string = formData.cover_url || '';
    let fileInputRef: HTMLInputElement;

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
            edition_number: '', printing_number: '', original_edition: '', is_first_edition: false,
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

    function handleFileSelection(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            selectedImageFile = target.files[0];
            imagePreviewUrl = URL.createObjectURL(selectedImageFile);
            formData.cover_url = '';
        }
    }

    function triggerFileInput() {
        fileInputRef.click();
    }

    function handleSubmit() {
        onSubmit(formData as CreateBookPayload, selectedImageFile);
    }
</script>

<form class="book-form" on:submit|preventDefault={handleSubmit}>
    <div class="form-header">
        <h3>{initialData ? $t.form.editBook : $t.form.addNewBook}</h3>
        <div class="header-actions">
            <button type="button" class="btn-cancel" on:click={onCancel}>{$t.common.cancel}</button>
            <button type="submit" class="btn-submit">{$t.common.save}</button>
        </div>
    </div>

    <div class="form-scroll-area">
        <fieldset class="form-group">
            <legend>{$t.form.identifiers}</legend>

            <div class="smart-fetch-row">
                <input
                        type="text"
                        bind:value={fetchId}
                        placeholder="Enter ISBN, OCLC, or OLID..."
                        class="fetch-input"
                        on:keydown={(e) => e.key === 'Enter' && handleAutoFill()}
                />
                <button type="button" class="btn-autofill" on:click={handleAutoFill} disabled={isLookingUp || !fetchId}>
                    <DownloadCloud size={14} />
                    {isLookingUp ? $t.form.autofillLoading : $t.form.autofill}
                </button>
            </div>

            {#if fetchError}
                <div class="fetch-error-message">{fetchError}</div>
            {/if}

            <div class="input-row">
                <label for="isbn_13">{$t.form.isbn13}</label>
                <input type="text" id="isbn_13" bind:value={formData.isbn_13} />
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="isbn_10">{$t.form.isbn10}</label>
                    <input type="text" id="isbn_10" bind:value={formData.isbn_10} />
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
        </fieldset>

        <fieldset class="form-group">
            <legend>Cover Image</legend>
            <div class="cover-upload-container">
                <div class="cover-preview" class:has-image={!!imagePreviewUrl}>
                    {#if imagePreviewUrl}
                        <img src={imagePreviewUrl} alt="Cover Preview" />
                    {:else}
                        <div class="cover-placeholder">
                            <Camera size={32} color="#999" />
                            <span>{$t.grid.noCover}</span>
                        </div>
                    {/if}
                </div>
                <div class="cover-actions">
                    <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            bind:this={fileInputRef}
                            on:change={handleFileSelection}
                            style="display: none;"
                    />
                    <button type="button" class="btn-secondary" on:click={triggerFileInput}>
                        <UploadCloud size={16} /> Select File or Camera
                    </button>
                    <div class="input-row" style="width: 100%;">
                        <label for="cover_url_manual">Or external URL:</label>
                        <input type="url" id="cover_url_manual" bind:value={formData.cover_url} on:input={() => { imagePreviewUrl = formData.cover_url || ''; selectedImageFile = undefined; }} />
                    </div>
                </div>
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.essentialInfo}</legend>
            <div class="input-row">
                <label for="title">{$t.form.title}</label>
                <AutoExpandTextarea id="title" bind:value={formData.title} required={true} />
            </div>
            <div class="input-row">
                <label for="subtitle">{$t.form.subtitle}</label>
                <AutoExpandTextarea id="subtitle" bind:value={formData.subtitle} />
            </div>
            <div class="input-row">
                <label for="original_title">{$t.form.originalTitle}</label>
                <AutoExpandTextarea id="original_title" bind:value={formData.original_title} />
            </div>
            <div class="input-row">
                <label for="authors">{$t.form.authors}</label>
                <ChipInput id="authors" bind:values={formData.authors} placeholder="..." />
            </div>
            <div class="input-row">
                <label for="translators">{$t.form.translators}</label>
                <ChipInput id="translators" bind:values={formData.translators} placeholder="..." />
            </div>
            <div class="input-row">
                <label for="illustrators">{$t.form.illustrators}</label>
                <ChipInput id="illustrators" bind:values={formData.illustrators} placeholder="..." />
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.pubDetails}</legend>
            <div class="input-row">
                <label for="publisher">{$t.form.publisher}</label>
                <AutoExpandTextarea id="publisher" bind:value={formData.publisher} />
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="publish_date">{$t.form.pubDate}</label>
                    <input type="date" id="publish_date" bind:value={formData.publish_date} />
                </div>
                <div class="input-row">
                    <label for="original_publish_date">{$t.form.origPubDate}</label>
                    <input type="date" id="original_publish_date" bind:value={formData.original_publish_date} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="edition_number">{$t.form.editionNumber}</label>
                    <input type="text" id="edition_number" bind:value={formData.edition_number} />
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
                    <AutoExpandTextarea id="collection_name" bind:value={formData.collection_name} />
                </div>
                <div class="input-row">
                    <label for="volume_in_collection">{$t.form.volInCollection}</label>
                    <input type="number" id="volume_in_collection" bind:value={formData.volume_in_collection} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="series_name">{$t.form.seriesName}</label>
                    <AutoExpandTextarea id="series_name" bind:value={formData.series_name} />
                </div>
                <div class="input-row">
                    <label for="volume_in_series">{$t.form.volInSeries}</label>
                    <input type="number" id="volume_in_series" bind:value={formData.volume_in_series} />
                </div>
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.physicalProps}</legend>
            <div class="input-grid">
                <div class="input-row">
                    <label for="book_format">{$t.form.bookFormat}</label>
                    <input type="text" id="book_format" bind:value={formData.book_format} />
                </div>
                <div class="input-row">
                    <label for="page_count">{$t.form.pageCount}</label>
                    <input type="number" id="page_count" bind:value={formData.page_count} />
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
                    <AutoExpandTextarea id="language" bind:value={formData.language} />
                </div>
                <div class="input-row">
                    <label for="original_language">{$t.form.origLanguage}</label>
                    <AutoExpandTextarea id="original_language" bind:value={formData.original_language} />
                </div>
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.classification}</legend>
            <div class="input-row">
                <label for="subjects">{$t.form.subjects}</label>
                <ChipInput id="subjects" bind:values={formData.subjects} placeholder="..." />
            </div>
            <div class="input-row">
                <label for="genres">{$t.form.genres}</label>
                <ChipInput id="genres" bind:values={formData.genres} placeholder="..." />
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
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.acquisition}</legend>
            <div class="input-grid">
                <div class="input-row">
                    <label for="purchase_date">{$t.form.purchaseDate}</label>
                    <input type="date" id="purchase_date" bind:value={formData.purchase_date} />
                </div>
                <div class="input-row">
                    <label for="purchase_price">{$t.form.purchasePrice}</label>
                    <input type="number" step="0.01" id="purchase_price" bind:value={formData.purchase_price} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="store_or_vendor">{$t.form.storeOrVendor}</label>
                    <AutoExpandTextarea id="store_or_vendor" bind:value={formData.store_or_vendor} />
                </div>
                <div class="input-row">
                    <label for="acquisition_type">{$t.form.acquisitionType}</label>
                    <input type="text" id="acquisition_type" bind:value={formData.acquisition_type} />
                </div>
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.physicalLoc}</legend>
            <div class="input-grid">
                <div class="input-row">
                    <label for="location_property">{$t.form.locationProperty}</label>
                    <input type="text" id="location_property" bind:value={formData.location_property} />
                </div>
                <div class="input-row">
                    <label for="room">{$t.form.room}</label>
                    <input type="text" id="room" bind:value={formData.location_room} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="bookcase">{$t.form.bookcase}</label>
                    <input type="text" id="bookcase" bind:value={formData.location_bookcase} />
                </div>
                <div class="input-row">
                    <label for="location_shelf">{$t.form.shelf}</label>
                    <input type="text" id="location_shelf" bind:value={formData.location_shelf} />
                </div>
                <div class="input-row">
                    <label for="location_position">{$t.form.position}</label>
                    <input type="number" id="location_position" bind:value={formData.location_position} />
                </div>
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.conditionNotes}</legend>
            <div class="input-row">
                <label for="condition_state">{$t.form.conditionState}</label>
                <input type="text" id="condition_state" bind:value={formData.condition_state} />
            </div>
            <div class="input-row">
                <label for="personal_notes">{$t.form.personalNotes}</label>
                <AutoExpandTextarea id="personal_notes" bind:value={formData.personal_notes} />
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.readingProgress}</legend>
            <div class="input-grid">
                <div class="input-row">
                    <label for="read_status">{$t.form.readStatus}</label>
                    <select id="read_status" bind:value={formData.read_status} class="form-select">
                        <option value="unread">Unread</option>
                        <option value="reading">Reading</option>
                        <option value="read">Read</option>
                        <option value="dnf">Did Not Finish</option>
                    </select>
                </div>
                <div class="input-row">
                    <label for="rating">{$t.form.rating}</label>
                    <input type="number" min="0" max="10" id="rating" bind:value={formData.rating} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row">
                    <label for="date_started">{$t.form.dateStarted}</label>
                    <input type="date" id="date_started" bind:value={formData.date_started} />
                </div>
                <div class="input-row">
                    <label for="date_finished">{$t.form.dateFinished}</label>
                    <input type="date" id="date_finished" bind:value={formData.date_finished} />
                </div>
            </div>
            <div class="input-row">
                <label for="reading_notes">{$t.form.readingNotes}</label>
                <AutoExpandTextarea id="reading_notes" bind:value={formData.reading_notes} />
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.loanManagement}</legend>
            <div class="input-row checkbox-row">
                <input type="checkbox" id="is_loaned" bind:checked={formData.is_loaned} />
                <label for="is_loaned">{$t.form.isLoaned}</label>
            </div>
            {#if formData.is_loaned}
                <div class="input-row">
                    <label for="loaned_to">{$t.form.loanedTo}</label>
                    <input type="text" id="loaned_to" bind:value={formData.loaned_to} />
                </div>
                <div class="input-grid">
                    <div class="input-row">
                        <label for="loan_date">{$t.form.loanDate}</label>
                        <input type="datetime-local" id="loan_date" bind:value={formData.loan_date} />
                    </div>
                    <div class="input-row">
                        <label for="expected_return_date">{$t.form.expectedReturnDate}</label>
                        <input type="datetime-local" id="expected_return_date" bind:value={formData.expected_return_date} />
                    </div>
                </div>
            {/if}
        </fieldset>
    </div>
</form>

<style>
    .book-form {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: #f0f0f0;
    }

    .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 16px;
        border-bottom: 1px solid #ccc;
        margin-bottom: 16px;
    }

    .form-header h3 {
        margin: 0;
        font-size: 16px;
        color: #1a1a1a;
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
        border: 1px solid #ccc;
    }

    .btn-cancel {
        background-color: #ffffff;
    }

    .btn-submit {
        background-color: #0066cc;
        color: #ffffff;
        border-color: #005bb5;
        font-weight: 500;
    }

    .btn-secondary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background-color: #ffffff;
        color: #333;
        border: 1px solid #ccc;
        font-weight: 500;
    }

    .btn-secondary:hover {
        background-color: #f9f9f9;
        border-color: #999;
    }

    .smart-fetch-row {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        align-items: stretch;
    }

    .fetch-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #0066cc;
        border-radius: 4px;
        font-size: 13px;
    }

    .btn-autofill {
        display: flex;
        align-items: center;
        gap: 6px;
        background-color: #0066cc;
        color: #ffffff;
        border: 1px solid #005bb5;
        font-weight: 500;
        white-space: nowrap;
    }

    .btn-autofill:hover:not(:disabled) {
        background-color: #005bb5;
    }

    .btn-autofill:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .form-scroll-area {
        flex: 1;
        overflow-y: auto;
        padding-right: 8px;
        display: flex;
        flex-direction: column;
        gap: 32px;
    }

    .form-group {
        border: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    legend {
        font-weight: 600;
        font-size: 12px;
        color: #0066cc;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #d0d0d0;
        width: 100%;
    }

    .cover-upload-container {
        display: flex;
        gap: 16px;
        align-items: center;
        background-color: #ffffff;
        padding: 12px;
        border-radius: 6px;
        border: 1px solid #ccc;
    }

    .cover-preview {
        width: 80px;
        height: 120px;
        background-color: #f5f5f5;
        border-radius: 4px;
        border: 1px dashed #aaa;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
    }

    .cover-preview.has-image {
        border-style: solid;
        border-color: #e0e0e0;
    }

    .cover-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .cover-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        color: #999;
        font-size: 10px;
    }

    .cover-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        align-items: flex-start;
    }

    .input-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .input-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
    }

    .checkbox-row {
        flex-direction: row;
        align-items: center;
        gap: 8px;
    }

    .checkbox-row input {
        width: auto;
    }

    label {
        font-size: 13px;
        font-weight: 500;
        color: #333;
    }

    input, .form-select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-family: inherit;
        font-size: 13px;
        box-sizing: border-box;
        background-color: #ffffff;
    }

    input:focus, .form-select:focus {
        outline: none;
        border-color: #0066cc;
    }

    .fetch-error-message {
        color: #cc0000;
        font-size: 12px;
        margin-top: -12px;
        margin-bottom: 12px;
        font-weight: 500;
    }
</style>
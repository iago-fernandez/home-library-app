<script lang="ts">
    import { t } from '$lib/i18n';
    import { bookStore } from '$lib/store';
    import { Info } from 'lucide-svelte';
    import AutoExpandTextarea from './AutoExpandTextarea.svelte';
    import ChipInput from './ChipInput.svelte';

    export let onCancel: () => void;

    let isLoading = false;
    let message = '';
    let isError = false;

    const selectedIds = bookStore.selectedIds;

    let formData: Record<string, any> = {};
    let isMixed: Record<string, boolean> = {};
    let isModified: Record<string, boolean> = {};

    const fields = [
        { id: 'authors', type: 'array' },
        { id: 'translators', type: 'array' },
        { id: 'illustrators', type: 'array' },
        { id: 'publisher', type: 'text' },
        { id: 'publish_date', type: 'date' },
        { id: 'original_publish_date', type: 'date' },
        { id: 'edition_number', type: 'text' },
        { id: 'printing_number', type: 'text' },
        { id: 'original_edition', type: 'text' },
        { id: 'is_first_edition', type: 'boolean' },
        { id: 'collection_name', type: 'text' },
        { id: 'volume_in_collection', type: 'number' },
        { id: 'series_name', type: 'text' },
        { id: 'volume_in_series', type: 'number' },
        { id: 'book_format', type: 'text' },
        { id: 'page_count', type: 'number' },
        { id: 'dimensions', type: 'text' },
        { id: 'weight', type: 'text' },
        { id: 'language', type: 'text' },
        { id: 'original_language', type: 'text' },
        { id: 'subjects', type: 'array' },
        { id: 'genres', type: 'array' },
        { id: 'target_audience', type: 'text' },
        { id: 'description', type: 'text' },
        { id: 'table_of_contents', type: 'text' },
        { id: 'purchase_date', type: 'date' },
        { id: 'purchase_price', type: 'number' },
        { id: 'store_or_vendor', type: 'text' },
        { id: 'acquisition_type', type: 'text' },
        { id: 'location_property', type: 'text' },
        { id: 'location_room', type: 'text' },
        { id: 'location_bookcase', type: 'text' },
        { id: 'location_shelf', type: 'text' },
        { id: 'location_position', type: 'number' },
        { id: 'condition_state', type: 'text' },
        { id: 'personal_notes', type: 'text' },
        { id: 'read_status', type: 'text' },
        { id: 'rating', type: 'number' },
        { id: 'date_started', type: 'date' },
        { id: 'date_finished', type: 'date' },
        { id: 'reading_notes', type: 'text' },
        { id: 'is_loaned', type: 'boolean' },
        { id: 'loaned_to', type: 'text' },
        { id: 'loan_date', type: 'date' },
        { id: 'expected_return_date', type: 'date' }
    ];

    $: {
        const selectedBooks = $bookStore.filter(b => $selectedIds.includes(b.id));
        if (selectedBooks.length > 0 && Object.keys(formData).length === 0) {
            initializeFormData(selectedBooks);
        }
    }

    function initializeFormData(selectedBooks: any[]) {
        const newFormData: Record<string, any> = {};
        const newIsMixed: Record<string, boolean> = {};

        fields.forEach(f => {
            const firstBook = selectedBooks[0];
            let allSame = true;

            for (let i = 1; i < selectedBooks.length; i++) {
                const currentBook = selectedBooks[i];
                if (f.type === 'array') {
                    const arr1 = (firstBook[f.id as keyof typeof firstBook] || []) as string[];
                    const arr2 = (currentBook[f.id as keyof typeof currentBook] || []) as string[];
                    if (arr1.length !== arr2.length || !arr1.every((v, idx) => v === arr2[idx])) {
                        allSame = false;
                        break;
                    }
                } else {
                    if (firstBook[f.id as keyof typeof firstBook] !== currentBook[f.id as keyof typeof currentBook]) {
                        allSame = false;
                        break;
                    }
                }
            }

            newIsMixed[f.id] = !allSame;

            if (allSame) {
                if (f.type === 'array') {
                    newFormData[f.id] = [...((firstBook[f.id as keyof typeof firstBook] as string[]) || [])];
                } else {
                    newFormData[f.id] = firstBook[f.id as keyof typeof firstBook];
                    if (newFormData[f.id] === null || newFormData[f.id] === undefined) {
                        newFormData[f.id] = f.type === 'boolean' ? false : '';
                    }
                }
            } else {
                newFormData[f.id] = f.type === 'array' ? [] : (f.type === 'boolean' ? false : '');
            }
        });

        formData = newFormData;
        isMixed = newIsMixed;
        isModified = {};
    }

    function markModified(fieldId: string) {
        isModified[fieldId] = true;
        isMixed[fieldId] = false;
    }

    async function handleSave() {
        const payload: Record<string, any> = {};
        let hasChanges = false;

        fields.forEach(field => {
            if (isModified[field.id]) {
                payload[field.id] = formData[field.id];
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            onCancel();
            return;
        }

        isLoading = true;
        message = '';

        try {
            await bookStore.updateBooksBatch($selectedIds, payload);
            message = $t.batchEdit.successMessage;
            isError = false;

            setTimeout(() => {
                onCancel();
            }, 1000);
        } catch (e) {
            message = 'Error updating records';
            isError = true;
            isLoading = false;
        }
    }
</script>

<form class="book-form" on:submit|preventDefault={handleSave}>
    <div class="form-header">
        <h3>{$t.batchEdit.title} ({$selectedIds.length})</h3>
        <div class="header-actions">
            <button type="button" class="btn-cancel" on:click={onCancel} disabled={isLoading}>{$t.common.cancel}</button>
            <button type="submit" class="btn-submit" disabled={isLoading}>
                {isLoading ? '...' : $t.common.save}
            </button>
        </div>
    </div>

    <div class="form-scroll-area">
        <div class="info-banner">
            <Info size={16} color="#1890ff" />
            <p>{$t.batchEdit.warning}</p>
        </div>

        <fieldset class="form-group">
            <legend>{$t.form.essentialInfo}</legend>
            <div class="input-row" class:modified={isModified['authors']} on:input={() => markModified('authors')} on:change={() => markModified('authors')}>
                <label for="authors">{$t.form.authors}</label>
                <ChipInput id="authors" bind:values={formData.authors} />
            </div>
            <div class="input-row" class:modified={isModified['translators']} on:input={() => markModified('translators')} on:change={() => markModified('translators')}>
                <label for="translators">{$t.form.translators}</label>
                <ChipInput id="translators" bind:values={formData.translators} />
            </div>
            <div class="input-row" class:modified={isModified['illustrators']} on:input={() => markModified('illustrators')} on:change={() => markModified('illustrators')}>
                <label for="illustrators">{$t.form.illustrators}</label>
                <ChipInput id="illustrators" bind:values={formData.illustrators} />
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.pubDetails}</legend>
            <div class="input-row" class:modified={isModified['publisher']}>
                <label for="publisher">{$t.form.publisher}</label>
                <AutoExpandTextarea id="publisher" bind:value={formData.publisher} on:input={() => markModified('publisher')} />
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['publish_date']}>
                    <label for="publish_date">{$t.form.pubDate}</label>
                    <input type="date" id="publish_date" bind:value={formData.publish_date} on:input={() => markModified('publish_date')} />
                </div>
                <div class="input-row" class:modified={isModified['original_publish_date']}>
                    <label for="original_publish_date">{$t.form.origPubDate}</label>
                    <input type="date" id="original_publish_date" bind:value={formData.original_publish_date} on:input={() => markModified('original_publish_date')} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['edition_number']}>
                    <label for="edition_number">{$t.form.editionNumber}</label>
                    <input type="text" id="edition_number" bind:value={formData.edition_number} placeholder={isMixed['edition_number'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('edition_number')} />
                </div>
                <div class="input-row" class:modified={isModified['printing_number']}>
                    <label for="printing_number">{$t.form.printingNumber}</label>
                    <input type="text" id="printing_number" bind:value={formData.printing_number} placeholder={isMixed['printing_number'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('printing_number')} />
                </div>
            </div>
            <div class="input-row" class:modified={isModified['original_edition']}>
                <label for="original_edition">{$t.form.origEdition}</label>
                <AutoExpandTextarea id="original_edition" bind:value={formData.original_edition} on:input={() => markModified('original_edition')} />
            </div>
            <div class="input-row checkbox-row" class:modified={isModified['is_first_edition']}>
                <input type="checkbox" id="is_first_edition" bind:checked={formData.is_first_edition} indeterminate={isMixed['is_first_edition']} on:change={() => markModified('is_first_edition')} />
                <label for="is_first_edition">{$t.form.isFirstEdition}</label>
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['collection_name']}>
                    <label for="collection_name">{$t.form.collectionName}</label>
                    <AutoExpandTextarea id="collection_name" bind:value={formData.collection_name} on:input={() => markModified('collection_name')} />
                </div>
                <div class="input-row" class:modified={isModified['volume_in_collection']}>
                    <label for="volume_in_collection">{$t.form.volInCollection}</label>
                    <input type="number" id="volume_in_collection" bind:value={formData.volume_in_collection} placeholder={isMixed['volume_in_collection'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('volume_in_collection')} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['series_name']}>
                    <label for="series_name">{$t.form.seriesName}</label>
                    <AutoExpandTextarea id="series_name" bind:value={formData.series_name} on:input={() => markModified('series_name')} />
                </div>
                <div class="input-row" class:modified={isModified['volume_in_series']}>
                    <label for="volume_in_series">{$t.form.volInSeries}</label>
                    <input type="number" id="volume_in_series" bind:value={formData.volume_in_series} placeholder={isMixed['volume_in_series'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('volume_in_series')} />
                </div>
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.physicalProps}</legend>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['book_format']}>
                    <label for="book_format">{$t.form.bookFormat}</label>
                    <input type="text" id="book_format" bind:value={formData.book_format} placeholder={isMixed['book_format'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('book_format')} />
                </div>
                <div class="input-row" class:modified={isModified['page_count']}>
                    <label for="page_count">{$t.form.pageCount}</label>
                    <input type="number" id="page_count" bind:value={formData.page_count} placeholder={isMixed['page_count'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('page_count')} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['dimensions']}>
                    <label for="dimensions">{$t.form.dimensions}</label>
                    <input type="text" id="dimensions" bind:value={formData.dimensions} placeholder={isMixed['dimensions'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('dimensions')} />
                </div>
                <div class="input-row" class:modified={isModified['weight']}>
                    <label for="weight">{$t.form.weight}</label>
                    <input type="text" id="weight" bind:value={formData.weight} placeholder={isMixed['weight'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('weight')} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['language']}>
                    <label for="language">{$t.form.language}</label>
                    <AutoExpandTextarea id="language" bind:value={formData.language} on:input={() => markModified('language')} />
                </div>
                <div class="input-row" class:modified={isModified['original_language']}>
                    <label for="original_language">{$t.form.origLanguage}</label>
                    <AutoExpandTextarea id="original_language" bind:value={formData.original_language} on:input={() => markModified('original_language')} />
                </div>
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.classification}</legend>
            <div class="input-row" class:modified={isModified['subjects']} on:input={() => markModified('subjects')} on:change={() => markModified('subjects')}>
                <label for="subjects">{$t.form.subjects}</label>
                <ChipInput id="subjects" bind:values={formData.subjects} />
            </div>
            <div class="input-row" class:modified={isModified['genres']} on:input={() => markModified('genres')} on:change={() => markModified('genres')}>
                <label for="genres">{$t.form.genres}</label>
                <ChipInput id="genres" bind:values={formData.genres} />
            </div>
            <div class="input-row" class:modified={isModified['target_audience']}>
                <label for="target_audience">{$t.form.targetAudience}</label>
                <input type="text" id="target_audience" bind:value={formData.target_audience} placeholder={isMixed['target_audience'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('target_audience')} />
            </div>
            <div class="input-row" class:modified={isModified['description']}>
                <label for="description">{$t.form.description}</label>
                <AutoExpandTextarea id="description" bind:value={formData.description} on:input={() => markModified('description')} />
            </div>
            <div class="input-row" class:modified={isModified['table_of_contents']}>
                <label for="table_of_contents">{$t.form.tableOfContents}</label>
                <AutoExpandTextarea id="table_of_contents" bind:value={formData.table_of_contents} on:input={() => markModified('table_of_contents')} />
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.acquisition}</legend>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['purchase_date']}>
                    <label for="purchase_date">{$t.form.purchaseDate}</label>
                    <input type="date" id="purchase_date" bind:value={formData.purchase_date} on:input={() => markModified('purchase_date')} />
                </div>
                <div class="input-row" class:modified={isModified['purchase_price']}>
                    <label for="purchase_price">{$t.form.purchasePrice}</label>
                    <input type="number" step="0.01" id="purchase_price" bind:value={formData.purchase_price} placeholder={isMixed['purchase_price'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('purchase_price')} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['store_or_vendor']}>
                    <label for="store_or_vendor">{$t.form.storeOrVendor}</label>
                    <AutoExpandTextarea id="store_or_vendor" bind:value={formData.store_or_vendor} on:input={() => markModified('store_or_vendor')} />
                </div>
                <div class="input-row" class:modified={isModified['acquisition_type']}>
                    <label for="acquisition_type">{$t.form.acquisitionType}</label>
                    <input type="text" id="acquisition_type" bind:value={formData.acquisition_type} placeholder={isMixed['acquisition_type'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('acquisition_type')} />
                </div>
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.physicalLoc}</legend>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['location_property']}>
                    <label for="location_property">{$t.form.locationProperty}</label>
                    <input type="text" id="location_property" bind:value={formData.location_property} placeholder={isMixed['location_property'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('location_property')} />
                </div>
                <div class="input-row" class:modified={isModified['location_room']}>
                    <label for="room">{$t.form.room}</label>
                    <input type="text" id="room" bind:value={formData.location_room} placeholder={isMixed['location_room'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('location_room')} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['location_bookcase']}>
                    <label for="bookcase">{$t.form.bookcase}</label>
                    <input type="text" id="bookcase" bind:value={formData.location_bookcase} placeholder={isMixed['location_bookcase'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('location_bookcase')} />
                </div>
                <div class="input-row" class:modified={isModified['location_shelf']}>
                    <label for="location_shelf">{$t.form.shelf}</label>
                    <input type="text" id="location_shelf" bind:value={formData.location_shelf} placeholder={isMixed['location_shelf'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('location_shelf')} />
                </div>
                <div class="input-row" class:modified={isModified['location_position']}>
                    <label for="location_position">{$t.form.position}</label>
                    <input type="number" id="location_position" bind:value={formData.location_position} placeholder={isMixed['location_position'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('location_position')} />
                </div>
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.conditionNotes}</legend>
            <div class="input-row" class:modified={isModified['condition_state']}>
                <label for="condition_state">{$t.form.conditionState}</label>
                <input type="text" id="condition_state" bind:value={formData.condition_state} placeholder={isMixed['condition_state'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('condition_state')} />
            </div>
            <div class="input-row" class:modified={isModified['personal_notes']}>
                <label for="personal_notes">{$t.form.personalNotes}</label>
                <AutoExpandTextarea id="personal_notes" bind:value={formData.personal_notes} on:input={() => markModified('personal_notes')} />
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.readingProgress}</legend>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['read_status']}>
                    <label for="read_status">{$t.form.readStatus}</label>
                    <select id="read_status" class="form-select" class:mixed-input={isMixed['read_status']} value={isMixed['read_status'] ? '' : formData['read_status']} on:change={(e) => { formData.read_status = e.currentTarget.value; markModified('read_status'); }}>
                        {#if isMixed['read_status']}
                            <option value="" disabled selected hidden>{$t.batchEdit.multipleValues}</option>
                        {/if}
                        <option value="unread">{$t.form.statusUnread}</option>
                        <option value="reading">{$t.form.statusReading}</option>
                        <option value="read">{$t.form.statusRead}</option>
                        <option value="dnf">{$t.form.statusDnf}</option>
                    </select>
                </div>
                <div class="input-row" class:modified={isModified['rating']}>
                    <label for="rating">{$t.form.rating}</label>
                    <input type="number" min="0" max="10" id="rating" bind:value={formData.rating} placeholder={isMixed['rating'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('rating')} />
                </div>
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['date_started']}>
                    <label for="date_started">{$t.form.dateStarted}</label>
                    <input type="date" id="date_started" bind:value={formData.date_started} on:input={() => markModified('date_started')} />
                </div>
                <div class="input-row" class:modified={isModified['date_finished']}>
                    <label for="date_finished">{$t.form.dateFinished}</label>
                    <input type="date" id="date_finished" bind:value={formData.date_finished} on:input={() => markModified('date_finished')} />
                </div>
            </div>
            <div class="input-row" class:modified={isModified['reading_notes']}>
                <label for="reading_notes">{$t.form.readingNotes}</label>
                <AutoExpandTextarea id="reading_notes" bind:value={formData.reading_notes} on:input={() => markModified('reading_notes')} />
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>{$t.form.loanManagement}</legend>
            <div class="input-row checkbox-row" class:modified={isModified['is_loaned']}>
                <input type="checkbox" id="is_loaned" bind:checked={formData.is_loaned} indeterminate={isMixed['is_loaned']} on:change={() => markModified('is_loaned')} />
                <label for="is_loaned">{$t.form.isLoaned}</label>
            </div>
            <div class="input-row" class:modified={isModified['loaned_to']}>
                <label for="loaned_to">{$t.form.loanedTo}</label>
                <input type="text" id="loaned_to" bind:value={formData.loaned_to} placeholder={isMixed['loaned_to'] ? $t.batchEdit.multipleValues : ''} on:input={() => markModified('loaned_to')} />
            </div>
            <div class="input-grid">
                <div class="input-row" class:modified={isModified['loan_date']}>
                    <label for="loan_date">{$t.form.loanDate}</label>
                    <input type="date" id="loan_date" bind:value={formData.loan_date} on:input={() => markModified('loan_date')} />
                </div>
                <div class="input-row" class:modified={isModified['expected_return_date']}>
                    <label for="expected_return_date">{$t.form.expectedReturnDate}</label>
                    <input type="date" id="expected_return_date" bind:value={formData.expected_return_date} on:input={() => markModified('expected_return_date')} />
                </div>
            </div>
        </fieldset>

        {#if message}
            <p class="status-msg" class:error-msg={isError}>{message}</p>
        {/if}
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
        color: #333;
    }

    .btn-submit {
        background-color: #0066cc;
        color: #ffffff;
        border-color: #005bb5;
        font-weight: 500;
    }

    .btn-submit:disabled {
        opacity: 0.6;
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

    .info-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background-color: #e6f7ff;
        border: 1px solid #91d5ff;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: -16px;
    }

    .info-banner p {
        margin: 0;
        font-size: 12px;
        color: #0050b3;
        line-height: 1.4;
        margin-top: 1px;
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

    .input-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        border-left: 2px solid transparent;
        padding-left: 6px;
        margin-left: -8px;
        transition: border-color 0.2s;
    }

    .input-row.modified {
        border-left-color: #0066cc;
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
        transition: all 0.2s;
    }

    input:focus, .form-select:focus {
        outline: none;
        border-color: #0066cc;
    }

    .mixed-input::placeholder {
        color: #999;
        font-style: italic;
    }

    .mixed-input {
        color: #666;
    }

    .status-msg {
        font-size: 13px;
        color: #52c41a;
        margin: 0;
        font-weight: 500;
        text-align: center;
    }

    .error-msg {
        color: #ff4d4f;
    }
</style>
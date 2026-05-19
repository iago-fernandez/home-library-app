<script lang="ts">
    import { bookStore } from '$lib/store';
    import { activeMosaicAttributes } from '$lib/stores/preferences';
    import BookCover from './BookCover.svelte';

    $: books = $bookStore;
    const selectedIds = bookStore.selectedIds;
    const multiSelectMode = bookStore.multiSelectMode;

    function handleSelect(event: MouseEvent | KeyboardEvent, id: string) {
        if (event.ctrlKey || event.metaKey || $multiSelectMode) {
            let newSelection = [...$selectedIds];
            if (newSelection.includes(id)) {
                newSelection = newSelection.filter(selectedId => selectedId !== id);
            } else {
                newSelection.push(id);
            }
            bookStore.selectedIds.set(newSelection);
        } else {
            bookStore.selectedIds.set([id]);
            bookStore.selectedId.set(id);
        }
    }

    function formatAttribute(book: any, attrId: string): string {
        const val = book[attrId];
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (val === null || val === undefined || val === '') return '';
        return String(val);
    }
</script>

<div class="mosaic-container">
    {#each books as book (book.id)}
        <div
                class="book-card"
                class:selected={$selectedIds.includes(book.id)}
                on:click={(e) => handleSelect(e, book.id)}
                on:keydown={(e) => e.key === 'Enter' && handleSelect(e, book.id)}
                role="button"
                tabindex="0"
        >
            <div class="cover-wrapper">
                <BookCover src={book.cover_url} alt={book.title} />
            </div>
            <div class="info">
                <h4>{book.title}</h4>
                <div class="attributes-list">
                    {#each $activeMosaicAttributes as attrId}
                        {#if formatAttribute(book, attrId)}
                            <p class="attr-text" title={formatAttribute(book, attrId)}>{formatAttribute(book, attrId)}</p>
                        {/if}
                    {/each}
                </div>
            </div>
        </div>
    {/each}
</div>

<style>
    .mosaic-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        grid-auto-rows: max-content;
        gap: 16px;
        padding: 16px;
        overflow-y: auto;
        height: 100%;
        background-color: #f9f9f9;
        box-sizing: border-box;
    }
    .book-card {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        outline: none;
        height: 100%;
    }
    .book-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.08);
    }
    .book-card:focus {
        border-color: #0066cc;
        box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
    }
    .book-card.selected {
        border: 2px solid #0066cc;
        background-color: #f0f8ff;
    }
    .cover-wrapper {
        height: 200px;
        width: 100%;
        flex-shrink: 0;
        border-bottom: 1px solid #f0f0f0;
    }
    .info {
        padding: 10px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        overflow: hidden;
    }
    .info h4 {
        margin: 0 0 6px 0;
        font-size: 13px;
        color: #1a1a1a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .attributes-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .attr-text {
        margin: 0;
        font-size: 11px;
        color: #666;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
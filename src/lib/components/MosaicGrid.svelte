<script lang="ts">
    import { bookStore } from '$lib/store';
    import { t } from '$lib/i18n';

    $: books = $bookStore;
    const selectedIds = bookStore.selectedIds;
    const multiSelectMode = bookStore.multiSelectMode;
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    function getCoverUrl(path: string) {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${API_BASE_URL}${path}`;
    }

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
</script>

<div class="mosaic-container">
    {#each books as book (book.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
                class="book-card"
                class:selected={$selectedIds.includes(book.id)}
                on:click={(e) => handleSelect(e, book.id)}
                on:keydown={(e) => e.key === 'Enter' && handleSelect(e, book.id)}
                role="button"
                tabindex="0"
        >
            <div class="cover-wrapper">
                {#if book.cover_url}
                    <img src={getCoverUrl(book.cover_url)} alt={book.title} loading="lazy" />
                {:else}
                    <div class="no-cover">{$t.grid.noCover}</div>
                {/if}
            </div>
            <div class="info">
                <h4>{book.title}</h4>
                <p>{book.authors?.join(', ') || ''}</p>
            </div>
        </div>
    {/each}
</div>

<style>
    .mosaic-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        grid-auto-rows: 280px;
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
        background: #e3e3e3;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-bottom: 1px solid #f0f0f0;
    }
    .cover-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .no-cover {
        font-size: 12px;
        color: #888;
        font-weight: 500;
    }
    .info {
        padding: 10px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    .info h4 {
        margin: 0 0 4px 0;
        font-size: 13px;
        color: #1a1a1a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .info p {
        margin: 0;
        font-size: 11px;
        color: #666;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
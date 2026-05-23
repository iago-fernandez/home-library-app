<script lang="ts">
    import { bookStore } from '$lib/store';
    import { activeMosaicAttributes } from '$lib/stores/preferences';
    import BookCover from './BookCover.svelte';
    import { Search, ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-svelte';
    import DropdownSelect from './DropdownSelect.svelte';
    import { t } from '$lib/i18n';
    import { activeColumns, availableColumns } from '$lib/stores/preferences';
    import { tick, onMount } from 'svelte';

    $: books = $bookStore;
    const selectedIds = bookStore.selectedIds;
    const multiSelectMode = bookStore.multiSelectMode;

    let lastSelectedIndex = -1;

    function handleSelect(event: MouseEvent | KeyboardEvent, id: string, index: number) {
        const isCtrl = event.ctrlKey || event.metaKey || $multiSelectMode;
        const isShift = event.shiftKey;
        let newSelection = [...$selectedIds];

        if (isShift && lastSelectedIndex !== -1) {
            if (event instanceof MouseEvent) event.preventDefault();
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            const rangeIds = books.slice(start, end + 1).map(b => b.id);
            if (isCtrl) {
                const idSet = new Set([...newSelection, ...rangeIds]);
                newSelection = Array.from(idSet);
            } else {
                newSelection = rangeIds;
            }
        } else if (isCtrl) {
            if (newSelection.includes(id)) {
                newSelection = newSelection.filter(selectedId => selectedId !== id);
            } else {
                newSelection.push(id);
            }
            lastSelectedIndex = index;
        } else {
            if (newSelection.length === 1 && newSelection[0] === id) {
                newSelection = [];
                lastSelectedIndex = -1;
            } else {
                newSelection = [id];
                lastSelectedIndex = index;
            }
        }
        
        bookStore.selectedIds.set(newSelection);
        bookStore.selectedId.set(newSelection.length === 1 ? newSelection[0] : null);
    }

    function formatAttribute(book: any, attrId: string): string {
        const val = book[attrId];
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (val === null || val === undefined || val === '') return '';
        return String(val);
    }

    const localSearchActive = bookStore.localSearchActive;
    let localSearchQuery = '';
    let localSearchColumn = 'all';
    let isCaseSensitive = false;
    let matchIndices: number[] = [];
    let currentMatchIndex = -1;
    let localSearchInput: HTMLInputElement;
    let isMounted = false;

    $: searchColumns = [
        { value: 'all', label: $t.grid.allColumns },
        ...$activeColumns.map(id => {
            const colDef = availableColumns.find(c => c.id === id);
            return { value: id, label: colDef ? colDef.label : id };
        })
    ];

    $: if ($localSearchActive && isMounted) {
        tick().then(() => { localSearchInput?.focus(); });
    } else {
        localSearchQuery = ''; matchIndices = []; currentMatchIndex = -1;
    }

    onMount(() => {
        isMounted = true;
    });

    function toggleLocalSearch() { bookStore.toggleLocalSearch(); }
    function toggleCaseSensitivity() { isCaseSensitive = !isCaseSensitive; executeLocalSearch(); }

    function executeLocalSearch() {
        if (!localSearchQuery.trim()) {
            matchIndices = []; currentMatchIndex = -1; return;
        }
        const query = isCaseSensitive ? localSearchQuery : localSearchQuery.toLowerCase();
        matchIndices = books.reduce((acc: number[], book, index) => {
            let matches = false;
            if (localSearchColumn === 'all') {
                const searchableFields = $activeColumns.map(id => formatAttribute(book, id));
                matches = searchableFields.some(field => {
                    const target = isCaseSensitive ? field : field.toLowerCase();
                    return target.includes(query);
                });
            } else {
                const fieldVal = formatAttribute(book, localSearchColumn);
                const target = isCaseSensitive ? fieldVal : fieldVal.toLowerCase();
                matches = target.includes(query);
            }
            if (matches) acc.push(index);
            return acc;
        }, []);
        if (matchIndices.length > 0) { currentMatchIndex = 0; scrollToMatch(); }
        else { currentMatchIndex = -1; }
    }

    function nextMatch() {
        if (matchIndices.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % matchIndices.length;
        scrollToMatch();
    }

    function prevMatch() {
        if (matchIndices.length === 0) return;
        currentMatchIndex = (currentMatchIndex - 1 + matchIndices.length) % matchIndices.length;
        scrollToMatch();
    }

    function scrollToMatch() {
        if (currentMatchIndex >= 0 && currentMatchIndex < matchIndices.length) {
            const index = matchIndices[currentMatchIndex];
            bookStore.selectedIds.set([books[index].id]);
            bookStore.selectedId.set(books[index].id);
            const card = document.getElementById(`mosaic-card-${books[index].id}`);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    function handleGlobalKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault(); toggleLocalSearch(); return;
        }
        if (event.key === 'Escape') {
            if ($localSearchActive) { toggleLocalSearch(); }
            else if ($multiSelectMode) { bookStore.toggleMultiSelectMode(); }
            else { bookStore.clearSelection(); bookStore.selectedId.set(null); lastSelectedIndex = -1; }
        }
        if (event.key === 'Delete' && $selectedIds.length > 0) {
            event.preventDefault();
            if (confirm(`${$selectedIds.length} ${$t.actions.confirmBatchDelete}`)) {
                bookStore.deleteBooksBatch($selectedIds);
            }
        }
    }
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class="mosaic-wrapper">
    <div class="mosaic-container">
        {#each books as book, index (book.id)}
            <div
                    id="mosaic-card-{book.id}"
                    class="book-card"
                class:selected={$selectedIds.includes(book.id)}
                on:click={(e) => handleSelect(e, book.id, index)}
                on:keydown={(e) => e.key === 'Enter' && handleSelect(e, book.id, index)}
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

    {#if $localSearchActive}
        <div class="local-search-bar">
            <Search size={16} color="var(--text-muted)" />
            <div style="width: 140px;">
                <DropdownSelect
                    options={searchColumns}
                    bind:value={localSearchColumn}
                    on:change={executeLocalSearch}
                    direction="up"
                />
            </div>
            <input bind:this={localSearchInput} type="text" placeholder={$t.grid.findPlaceholder} bind:value={localSearchQuery} on:input={executeLocalSearch} on:keydown={(e) => e.key === 'Enter' && nextMatch()}/>
            <button class="icon-btn-small {isCaseSensitive ? 'active' : ''}" title={$t.filters.caseSensitive} on:click={toggleCaseSensitivity}><CaseSensitive size={16} /></button>
            {#if matchIndices.length > 0} <span class="match-count">{currentMatchIndex + 1} {$t.grid.of} {matchIndices.length}</span>
            {:else if localSearchQuery} <span class="match-count no-matches">{$t.grid.noMatches}</span> {/if}
            <div class="nav-buttons">
                <button class="icon-btn-small" on:click={prevMatch} disabled={matchIndices.length === 0}><ChevronUp size={16} /></button>
                <button class="icon-btn-small" on:click={nextMatch} disabled={matchIndices.length === 0}><ChevronDown size={16} /></button>
            </div>
            <div class="divider"></div>
            <button class="icon-btn-small close-search" on:click={toggleLocalSearch}><X size={16} /></button>
        </div>
    {/if}
</div>

<style>
    .mosaic-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: var(--bg-color);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        overflow: hidden;
        transition: border-color 0.2s;
    }
    .mosaic-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        grid-auto-rows: max-content;
        gap: 16px;
        padding: 16px;
        overflow-y: auto;
        flex: 1;
        background-color: var(--bg-color);
        box-sizing: border-box;
    }
    .book-card {
        background: var(--panel-bg);
        border: 1px solid var(--border-color);
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
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
    }
    .book-card:focus { outline: none; }
    .book-card:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
    }
    .book-card.selected {
        border-color: var(--primary-color);
        background-color: var(--secondary-color);
        box-shadow: 0 0 0 1px var(--primary-color);
    }
    .local-search-bar { display: flex; align-items: center; background-color: var(--bg-color); border-top: 1px solid var(--border-color); padding: 4px 8px; gap: 8px; box-shadow: 0 -2px 4px rgba(0,0,0,0.02); z-index: 10; flex-shrink: 0; }
    .column-select { border: 1px solid var(--border-color); border-radius: 4px; padding: 4px; font-size: 12px; background-color: var(--panel-bg); color: var(--text-main); }
    .local-search-bar input { border: none; outline: none; flex: 1; font-family: inherit; font-size: 13px; padding: 4px; background-color: transparent; color: var(--text-main); }
    .match-count { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
    .no-matches { color: var(--danger-color); }
    .nav-buttons { display: flex; }
    .icon-btn-small { background: transparent; border: none; cursor: pointer; padding: 4px; color: var(--text-muted); border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background-color 0.1s; }
    .icon-btn-small:hover:not(:disabled) { background-color: var(--secondary-color); }
    .icon-btn-small.active { background-color: var(--primary-color); color: #ffffff; }
    .icon-btn-small:disabled { opacity: 0.3; cursor: not-allowed; }
    .divider { width: 1px; height: 16px; background-color: var(--border-color); margin: 0 4px; }
    .cover-wrapper {
        height: 200px;
        width: 100%;
        flex-shrink: 0;
        border-bottom: 1px solid var(--border-color);
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
        color: var(--text-main);
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
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
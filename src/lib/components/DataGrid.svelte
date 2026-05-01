<script lang="ts">
    import { bookStore } from '$lib/store';
    import { t } from '$lib/i18n';
    import { createVirtualizer } from '@tanstack/svelte-virtual';
    import { Search, ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-svelte';
    import { tick } from 'svelte';

    const totalBooks = bookStore.total;
    const selectedIds = bookStore.selectedIds;
    const sortConfig = bookStore.sortConfig;
    const orderConfig = bookStore.orderConfig;
    const localSearchActive = bookStore.localSearchActive;
    const multiSelectMode = bookStore.multiSelectMode;

    let scrollContainer: HTMLDivElement;
    let lastSelectedIndex = -1;

    let options = {
        count: 0,
        getScrollElement: () => scrollContainer,
        estimateSize: () => 36,
        overscan: 15,
    };

    const virtualizer = createVirtualizer(options);

    $: {
        options = {
            count: $totalBooks,
            getScrollElement: () => scrollContainer,
            estimateSize: () => 36,
            overscan: 15,
        };
        $virtualizer.setOptions(options);
    }

    $: virtualItems = $virtualizer.getVirtualItems();

    $: {
        const lastItem = virtualItems[virtualItems.length - 1];
        if (lastItem && lastItem.index >= $bookStore.length - 10 && $bookStore.length < $totalBooks) {
            bookStore.loadBooks();
        }
    }

    let localSearchQuery = '';
    let localSearchColumn = 'all';
    let isCaseSensitive = false;
    let matchIndices: number[] = [];
    let currentMatchIndex = -1;
    let localSearchInput: HTMLInputElement;

    $: searchColumns = [
        { value: 'all', label: $t.grid.allColumns },
        { value: 'title', label: $t.grid.title },
        { value: 'authors', label: $t.grid.authors },
        { value: 'publisher', label: $t.grid.publisher },
        { value: 'publish_date', label: $t.grid.date },
        { value: 'isbn_13', label: $t.grid.isbn },
        { value: 'location_room', label: $t.grid.room },
        { value: 'location_bookcase', label: $t.grid.bookcase }
    ];

    $: if ($localSearchActive) {
        tick().then(() => {
            localSearchInput?.focus();
        });
    } else {
        localSearchQuery = '';
        matchIndices = [];
        currentMatchIndex = -1;
    }

    function toggleLocalSearch() {
        bookStore.toggleLocalSearch();
    }

    function toggleCaseSensitivity() {
        isCaseSensitive = !isCaseSensitive;
        executeLocalSearch();
    }

    function executeLocalSearch() {
        if (!localSearchQuery.trim()) {
            matchIndices = [];
            currentMatchIndex = -1;
            return;
        }

        const query = isCaseSensitive ? localSearchQuery : localSearchQuery.toLowerCase();

        matchIndices = $bookStore.reduce((acc: number[], book, index) => {
            let matches = false;

            if (localSearchColumn === 'all') {
                const searchableFields = [
                    book.title,
                    book.authors.join(', '),
                    book.publisher || '',
                    book.publish_date || '',
                    book.isbn_13 || '',
                    book.location_room || '',
                    book.location_bookcase || ''
                ];
                matches = searchableFields.some(field => {
                    const target = isCaseSensitive ? field : field.toLowerCase();
                    return target.includes(query);
                });
            } else {
                let fieldVal = '';
                if (localSearchColumn === 'authors') {
                    fieldVal = book.authors.join(', ');
                } else {
                    fieldVal = String(book[localSearchColumn as keyof typeof book] || '');
                }
                const target = isCaseSensitive ? fieldVal : fieldVal.toLowerCase();
                matches = target.includes(query);
            }

            if (matches) {
                acc.push(index);
            }
            return acc;
        }, []);

        if (matchIndices.length > 0) {
            currentMatchIndex = 0;
            scrollToMatch();
        } else {
            currentMatchIndex = -1;
        }
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
            $virtualizer.scrollToIndex(index, { align: 'center' });
            bookStore.selectedIds.set([$bookStore[index].id]);
            bookStore.selectedId.set($bookStore[index].id);
        }
    }

    function handleRowClick(event: MouseEvent | KeyboardEvent, id: string, index: number) {
        const isCtrl = $multiSelectMode || event.ctrlKey || event.metaKey;
        const isShift = event.shiftKey;

        let newSelection = [...$selectedIds];

        if (isShift && lastSelectedIndex !== -1) {
            if (event instanceof MouseEvent) event.preventDefault();

            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            const rangeIds = $bookStore.slice(start, end + 1).map(b => b.id);

            if (isCtrl) {
                const idSet = new Set([...newSelection, ...rangeIds]);
                newSelection = Array.from(idSet);
            } else {
                newSelection = rangeIds;
            }
        } else if (isCtrl) {
            if (newSelection.includes(id)) {
                newSelection = newSelection.filter(i => i !== id);
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

        if (newSelection.length === 1) {
            bookStore.selectedId.set(newSelection[0]);
        } else {
            bookStore.selectedId.set(null);
        }
    }

    function handleGlobalKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            toggleLocalSearch();
            return;
        }

        if (event.key === 'Escape') {
            if ($localSearchActive) {
                toggleLocalSearch();
            } else if ($multiSelectMode) {
                bookStore.toggleMultiSelectMode();
            } else {
                bookStore.clearSelection();
                bookStore.selectedId.set(null);
                lastSelectedIndex = -1;
            }
        }

        if (event.key === 'Delete' && $selectedIds.length > 0) {
            event.preventDefault();
            if (confirm(`${$selectedIds.length} ${$t.actions.confirmBatchDelete}`)) {
                bookStore.deleteBooksBatch($selectedIds);
            }
        }
    }

    function handleSort(column: string) {
        bookStore.applySort(column);
    }
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class="table-wrapper" class:multi-select-active={$multiSelectMode}>
    {#if $localSearchActive}
        <div class="local-search-bar">
            <Search size={16} color="#666" />
            <select bind:value={localSearchColumn} class="column-select" on:change={executeLocalSearch}>
                {#each searchColumns as col}
                    <option value={col.value}>{col.label}</option>
                {/each}
            </select>
            <input
                    bind:this={localSearchInput}
                    type="text"
                    placeholder={$t.grid.findPlaceholder}
                    bind:value={localSearchQuery}
                    on:input={executeLocalSearch}
                    on:keydown={(e) => e.key === 'Enter' && nextMatch()}
            />
            <button
                    class="icon-btn-small {isCaseSensitive ? 'active' : ''}"
                    title={$t.filters.caseSensitive}
                    on:click={toggleCaseSensitivity}
            >
                <CaseSensitive size={16} />
            </button>
            {#if matchIndices.length > 0}
                <span class="match-count">{currentMatchIndex + 1} {$t.grid.of} {matchIndices.length}</span>
            {:else if localSearchQuery}
                <span class="match-count no-matches">{$t.grid.noMatches}</span>
            {/if}
            <div class="nav-buttons">
                <button class="icon-btn-small" on:click={prevMatch} disabled={matchIndices.length === 0}><ChevronUp size={16} /></button>
                <button class="icon-btn-small" on:click={nextMatch} disabled={matchIndices.length === 0}><ChevronDown size={16} /></button>
            </div>
            <div class="divider"></div>
            <button class="icon-btn-small close-search" on:click={toggleLocalSearch}><X size={16} /></button>
        </div>
    {/if}

    <div class="grid-header">
        <div class="cell header-cell sortable" role="button" tabindex="0" on:click={() => handleSort('title')} on:keydown={(e) => e.key === 'Enter' && handleSort('title')}>
            {$t.grid.title}
            {#if $sortConfig === 'title'}
                <span class="sort-indicator">{$orderConfig === 'asc' ? '↑' : '↓'}</span>
            {/if}
        </div>
        <div class="cell header-cell sortable" role="button" tabindex="0" on:click={() => handleSort('authors')} on:keydown={(e) => e.key === 'Enter' && handleSort('authors')}>
            {$t.grid.authors}
            {#if $sortConfig === 'authors'}
                <span class="sort-indicator">{$orderConfig === 'asc' ? '↑' : '↓'}</span>
            {/if}
        </div>
        <div class="cell header-cell sortable" role="button" tabindex="0" on:click={() => handleSort('publisher')} on:keydown={(e) => e.key === 'Enter' && handleSort('publisher')}>
            {$t.grid.publisher}
            {#if $sortConfig === 'publisher'}
                <span class="sort-indicator">{$orderConfig === 'asc' ? '↑' : '↓'}</span>
            {/if}
        </div>
        <div class="cell header-cell sortable" role="button" tabindex="0" on:click={() => handleSort('publish_date')} on:keydown={(e) => e.key === 'Enter' && handleSort('publish_date')}>
            {$t.grid.date}
            {#if $sortConfig === 'publish_date'}
                <span class="sort-indicator">{$orderConfig === 'asc' ? '↑' : '↓'}</span>
            {/if}
        </div>
        <div class="cell header-cell sortable" role="button" tabindex="0" on:click={() => handleSort('isbn_13')} on:keydown={(e) => e.key === 'Enter' && handleSort('isbn_13')}>
            {$t.grid.isbn}
            {#if $sortConfig === 'isbn_13'}
                <span class="sort-indicator">{$orderConfig === 'asc' ? '↑' : '↓'}</span>
            {/if}
        </div>
        <div class="cell header-cell sortable" role="button" tabindex="0" on:click={() => handleSort('location_room')} on:keydown={(e) => e.key === 'Enter' && handleSort('location_room')}>
            {$t.grid.room}
            {#if $sortConfig === 'location_room'}
                <span class="sort-indicator">{$orderConfig === 'asc' ? '↑' : '↓'}</span>
            {/if}
        </div>
        <div class="cell header-cell sortable" role="button" tabindex="0" on:click={() => handleSort('location_bookcase')} on:keydown={(e) => e.key === 'Enter' && handleSort('location_bookcase')}>
            {$t.grid.bookcase}
            {#if $sortConfig === 'location_bookcase'}
                <span class="sort-indicator">{$orderConfig === 'asc' ? '↑' : '↓'}</span>
            {/if}
        </div>
    </div>

    <div bind:this={scrollContainer} class="scroll-container">
        <div class="virtual-inner" style="height: {$virtualizer.getTotalSize()}px;">
            {#each virtualItems as virtualRow (virtualRow.index)}
                {@const book = $bookStore[virtualRow.index]}
                {#if book}
                    <div
                            class="grid-row"
                            class:selected={$selectedIds.includes(book.id)}
                            style="transform: translateY({virtualRow.start}px); height: {virtualRow.size}px;"
                            role="button"
                            tabindex="0"
                            on:click={(e) => handleRowClick(e, book.id, virtualRow.index)}
                            on:keydown={(e) => e.key === 'Enter' && handleRowClick(e, book.id, virtualRow.index)}
                    >
                        <div class="cell">{book.title}</div>
                        <div class="cell">{book.authors.join(', ')}</div>
                        <div class="cell">{book.publisher || ''}</div>
                        <div class="cell">{book.publish_date || ''}</div>
                        <div class="cell">{book.isbn_13 || ''}</div>
                        <div class="cell">{book.location_room || ''}</div>
                        <div class="cell">{book.location_bookcase || ''}</div>
                    </div>
                {:else}
                    <div class="grid-row skeleton" style="transform: translateY({virtualRow.start}px); height: {virtualRow.size}px;">
                        <div class="cell"><div class="skeleton-line"></div></div>
                        <div class="cell"><div class="skeleton-line"></div></div>
                        <div class="cell"><div class="skeleton-line"></div></div>
                        <div class="cell"><div class="skeleton-line"></div></div>
                        <div class="cell"><div class="skeleton-line"></div></div>
                        <div class="cell"><div class="skeleton-line"></div></div>
                        <div class="cell"><div class="skeleton-line"></div></div>
                    </div>
                {/if}
            {/each}
        </div>
    </div>
</div>

<style>
    .table-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        transition: border-color 0.2s;
    }

    .table-wrapper.multi-select-active {
        border: 2px solid #0066cc;
    }

    .local-search-bar {
        display: flex;
        align-items: center;
        background-color: #ffffff;
        border-bottom: 1px solid #ccc;
        padding: 4px 8px;
        gap: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        z-index: 10;
        flex-shrink: 0;
    }

    .column-select {
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px;
        font-size: 12px;
        background-color: #f9f9f9;
        color: #333;
    }

    .local-search-bar input {
        border: none;
        outline: none;
        flex: 1;
        font-family: inherit;
        font-size: 13px;
        padding: 4px;
    }

    .match-count {
        font-size: 12px;
        color: #666;
        white-space: nowrap;
    }

    .no-matches {
        color: #d32f2f;
    }

    .nav-buttons {
        display: flex;
    }

    .icon-btn-small {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #444;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.1s;
    }

    .icon-btn-small:hover:not(:disabled) {
        background-color: #e0e0e0;
    }

    .icon-btn-small.active {
        background-color: #0066cc;
        color: #ffffff;
    }

    .icon-btn-small:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .divider {
        width: 1px;
        height: 16px;
        background-color: #ccc;
        margin: 0 4px;
    }

    .grid-header {
        display: grid;
        grid-template-columns: 2fr 2fr 1.5fr 1fr 1.5fr 1fr 1fr;
        background-color: #f5f5f5;
        border-bottom: 1px solid #ccc;
        font-weight: 600;
        font-size: 13px;
        color: #333;
        flex-shrink: 0;
    }

    .scroll-container {
        flex: 1;
        overflow-y: auto;
        position: relative;
        overflow-anchor: none;
    }

    .virtual-inner {
        width: 100%;
        position: relative;
    }

    .grid-row {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        display: grid;
        grid-template-columns: 2fr 2fr 1.5fr 1fr 1.5fr 1fr 1fr;
        border-bottom: 1px solid #f0f0f0;
        font-size: 13px;
        color: #1a1a1a;
        background-color: #ffffff;
        box-sizing: border-box;
        cursor: pointer;
        user-select: none;
    }

    .grid-row:focus {
        outline: none;
        background-color: #f0f8ff;
    }

    .grid-row:hover {
        background-color: #f9f9f9;
    }

    .grid-row.selected {
        background-color: #e6f7ff;
        border-bottom: 1px solid #91d5ff;
    }

    .cell {
        padding: 8px 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
    }

    .header-cell {
        user-select: none;
    }

    .header-cell:focus {
        outline: 1px solid #0066cc;
        outline-offset: -1px;
    }

    .sortable {
        cursor: pointer;
        transition: background-color 0.1s;
    }

    .sortable:hover {
        background-color: #e8e8e8;
    }

    .sort-indicator {
        margin-left: 6px;
        color: #0066cc;
        font-weight: bold;
    }

    .skeleton {
        pointer-events: none;
    }

    .skeleton-line {
        height: 12px;
        width: 80%;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
    }

    @keyframes loading {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
</style>
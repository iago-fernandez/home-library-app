<script lang="ts">
    import { bookStore } from '$lib/store';
    import { t } from '$lib/i18n';
    import { activeColumns, availableColumns } from '$lib/stores/preferences';
    import { createVirtualizer } from '@tanstack/svelte-virtual';
    import {
        createSvelteTable,
        flexRender,
        getCoreRowModel,
        type ColumnDef,
        type TableOptions,
        type SortingState
    } from 'tanstack-table-8-svelte-5';
    import { Search, ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-svelte';
    import { tick, onMount } from 'svelte';

    const totalBooks = bookStore.total;
    const selectedIds = bookStore.selectedIds;
    const localSearchActive = bookStore.localSearchActive;
    const multiSelectMode = bookStore.multiSelectMode;
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    let scrollContainer: HTMLDivElement;
    let lastSelectedIndex = -1;
    let sorting: SortingState = [];
    let columnSizing: Record<string, number> = {};
    let isMounted = false;

    if (typeof window !== 'undefined') {
        const storedSizes = localStorage.getItem('library_column_sizes');
        if (storedSizes) {
            try {
                columnSizing = JSON.parse(storedSizes);
            } catch (e) {
                columnSizing = {};
            }
        }
    }

    function getCoverUrl(path: string) {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${API_BASE_URL}${path}`;
    }

    function getCellData(book: any, colId: string): string {
        if (!book) return '';
        const val = book[colId];
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return val ? String(val) : '';
    }

    function autoSizeColumn(colId: string) {
        let maxLen = colId.length;
        for (const book of $bookStore) {
            const val = getCellData(book, colId);
            if (val && val.length > maxLen) {
                maxLen = val.length;
            }
        }

        const calculatedWidth = Math.min(Math.max(maxLen * 8 + 32, 100), 500);
        columnSizing = { ...columnSizing, [colId]: calculatedWidth };

        if (typeof window !== 'undefined') {
            localStorage.setItem('library_column_sizes', JSON.stringify(columnSizing));
        }
    }

    $: columns = $activeColumns.map(id => {
        const colDef = availableColumns.find(c => c.id === id);
        return {
            id: id,
            accessorKey: id,
            header: colDef ? colDef.label : id,
            cell: info => getCellData(info.row.original, id),
            minSize: 100,
            size: 150,
        } as ColumnDef<any>;
    });

    let tableOptions: TableOptions<any>;
    $: tableOptions = {
        data: $bookStore,
        columns,
        state: { sorting, columnSizing },
        manualSorting: true,
        sortDescFirst: false,
        enableSortingRemoval: false,
        onSortingChange: (updater) => {
            sorting = typeof updater === 'function' ? updater(sorting) : updater;
            if (isMounted) {
                if (scrollContainer) {
                    scrollContainer.scrollTop = 0;
                }
                if (sorting.length > 0) {
                    bookStore.applySort(sorting[0].id, sorting[0].desc ? 'desc' : 'asc');
                } else {
                    bookStore.applySort(undefined, undefined);
                }
            }
        },
        onColumnSizingChange: (updater) => {
            columnSizing = typeof updater === 'function' ? updater(columnSizing) : updater;
            if (typeof window !== 'undefined') {
                localStorage.setItem('library_column_sizes', JSON.stringify(columnSizing));
            }
        },
        columnResizeMode: 'onChange',
        getCoreRowModel: getCoreRowModel(),
    };

    $: table = createSvelteTable(tableOptions);

    let virtualizerOptions: any;
    $: virtualizerOptions = {
        count: $totalBooks,
        getScrollElement: () => scrollContainer,
        estimateSize: () => 36,
        overscan: 15,
    };

    $: virtualizer = createVirtualizer(virtualizerOptions);
    $: virtualItems = $virtualizer.getVirtualItems();

    $: {
        if (isMounted) {
            const lastItem = virtualItems[virtualItems.length - 1];
            if (lastItem && lastItem.index >= $bookStore.length - 10 && $bookStore.length < $totalBooks) {
                bookStore.loadBooks();
            }
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
        matchIndices = $bookStore.reduce((acc: number[], book, index) => {
            let matches = false;
            if (localSearchColumn === 'all') {
                const searchableFields = $activeColumns.map(id => getCellData(book, id));
                matches = searchableFields.some(field => {
                    const target = isCaseSensitive ? field : field.toLowerCase();
                    return target.includes(query);
                });
            } else {
                const fieldVal = getCellData(book, localSearchColumn);
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
            } else { newSelection = rangeIds; }
        } else if (isCtrl) {
            if (newSelection.includes(id)) { newSelection = newSelection.filter(i => i !== id); }
            else { newSelection.push(id); }
            lastSelectedIndex = index;
        } else {
            if (newSelection.length === 1 && newSelection[0] === id) { newSelection = []; lastSelectedIndex = -1; }
            else { newSelection = [id]; lastSelectedIndex = index; }
        }
        bookStore.selectedIds.set(newSelection);
        bookStore.selectedId.set(newSelection.length === 1 ? newSelection[0] : null);
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

<div class="table-wrapper" class:multi-select-active={$multiSelectMode}>
    {#if $localSearchActive}
        <div class="local-search-bar">
            <Search size={16} color="#666" />
            <select bind:value={localSearchColumn} class="column-select" on:change={executeLocalSearch}>
                {#each searchColumns as col}
                    <option value={col.value}>{col.label}</option>
                {/each}
            </select>
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

    <div bind:this={scrollContainer} class="scroll-container">
        <div class="grid-table-inner" style="min-width: 100%; width: {$table.getTotalSize()}px">
            <div class="grid-header">
                {#each $table.getHeaderGroups() as headerGroup}
                    <div class="header-row">
                        {#each headerGroup.headers as header}
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <!-- svelte-ignore a11y_interactive_supports_focus -->
                            <div
                                    class="cell header-cell sortable"
                                    style="width: {header.getSize()}px"
                                    role="button"
                                    tabindex="0"
                                    on:click={header.column.getToggleSortingHandler()}
                                    on:keydown={(e) => e.key === 'Enter' && header.column.toggleSorting()}
                            >
                                {#if !header.isPlaceholder}
                                    <svelte:component this={flexRender(header.column.columnDef.header, header.getContext())} />

                                    {#if header.column.getIsSorted() === 'asc'}
                                        <span class="sort-indicator">↑</span>
                                    {:else if header.column.getIsSorted() === 'desc'}
                                        <span class="sort-indicator">↓</span>
                                    {/if}

                                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                    <div
                                            on:mousedown={header.getResizeHandler()}
                                            on:touchstart={header.getResizeHandler()}
                                            on:dblclick={(e) => { e.stopPropagation(); autoSizeColumn(header.column.id); }}
                                            class="resizer"
                                            class:isResizing={header.column.getIsResizing()}
                                            on:click={(e) => e.stopPropagation()}
                                            on:keydown={(e) => e.key === 'Enter' && e.stopPropagation()}
                                            role="separator"
                                            aria-orientation="vertical"
                                            tabindex="-1"
                                    ></div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/each}
            </div>

            <div class="virtual-inner" style="height: {$virtualizer.getTotalSize()}px; position: relative;">
                {#each virtualItems as virtualRow (virtualRow.index)}
                    {@const row = $table.getRowModel().rows[virtualRow.index]}
                    {#if row}
                        <div
                                class="grid-row"
                                class:selected={$selectedIds.includes(row.original.id)}
                                style="transform: translateY({virtualRow.start}px); height: {virtualRow.size}px; min-width: 100%; width: {$table.getTotalSize()}px"
                                role="button" tabindex="0"
                                on:click={(e) => handleRowClick(e, row.original.id, virtualRow.index)}
                                on:keydown={(e) => e.key === 'Enter' && handleRowClick(e, row.original.id, virtualRow.index)}
                        >
                            {#each row.getVisibleCells() as cell}
                                <div class="cell" style="width: {cell.column.getSize()}px" title={cell.column.id !== 'cover_url' && cell.getValue() ? String(cell.getValue()) : ''}>
                                    {#if cell.column.id === 'cover_url'}
                                        {#if cell.getValue()}
                                            <img src={getCoverUrl(String(cell.getValue()))} alt={$t.grid.coverAlt} class="row-cover" loading="lazy" />
                                        {:else}
                                            <div class="row-cover-placeholder"></div>
                                        {/if}
                                    {:else}
                                        <svelte:component this={flexRender(cell.column.columnDef.cell, cell.getContext())} />
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div class="grid-row skeleton" style="transform: translateY({virtualRow.start}px); height: {virtualRow.size}px; min-width: 100%; width: {$table.getTotalSize()}px">
                            {#each columns as col}
                                <div class="cell" style="width: {col.size}px"><div class="skeleton-line"></div></div>
                            {/each}
                        </div>
                    {/if}
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .table-wrapper { display: flex; flex-direction: column; height: 100%; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; transition: border-color 0.2s; }
    .table-wrapper.multi-select-active { border: 2px solid #0066cc; }
    .local-search-bar { display: flex; align-items: center; background-color: #ffffff; border-bottom: 1px solid #ccc; padding: 4px 8px; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); z-index: 10; flex-shrink: 0; }
    .column-select { border: 1px solid #ccc; border-radius: 4px; padding: 4px; font-size: 12px; background-color: #f9f9f9; color: #333; }
    .local-search-bar input { border: none; outline: none; flex: 1; font-family: inherit; font-size: 13px; padding: 4px; }
    .match-count { font-size: 12px; color: #666; white-space: nowrap; }
    .no-matches { color: #d32f2f; }
    .nav-buttons { display: flex; }
    .icon-btn-small { background: transparent; border: none; cursor: pointer; padding: 4px; color: #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background-color 0.1s; }
    .icon-btn-small:hover:not(:disabled) { background-color: #e0e0e0; }
    .icon-btn-small.active { background-color: #0066cc; color: #ffffff; }
    .icon-btn-small:disabled { opacity: 0.3; cursor: not-allowed; }
    .divider { width: 1px; height: 16px; background-color: #ccc; margin: 0 4px; }

    .scroll-container { flex: 1; overflow: auto; position: relative; }
    .grid-table-inner { position: relative; min-height: 100%; }

    .grid-header {
        background-color: #f5f5f5;
        border-bottom: 1px solid #ccc;
        font-weight: 600;
        font-size: 13px;
        color: #333;
        position: sticky;
        top: 0;
        z-index: 2;
    }

    .header-row { display: flex; min-width: 100%; }
    .virtual-inner { position: relative; }

    .grid-row {
        position: absolute;
        top: 0;
        left: 0;
        display: flex;
        border-bottom: 1px solid #f0f0f0;
        font-size: 13px;
        color: #1a1a1a;
        background-color: #ffffff;
        box-sizing: border-box;
        cursor: pointer;
        user-select: none;
    }

    .grid-row:focus { outline: none; background-color: #f0f8ff; }
    .grid-row:hover { background-color: #f9f9f9; }
    .grid-row.selected { background-color: #e6f7ff; border-bottom: 1px solid #91d5ff; }

    .cell {
        padding: 8px 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        box-sizing: border-box;
        position: relative;
    }

    .header-cell { user-select: none; }
    .header-cell:focus { outline: 1px solid #0066cc; outline-offset: -1px; }

    .sortable { cursor: pointer; transition: background-color 0.1s; }
    .sortable:hover { background-color: #e8e8e8; }

    .sort-indicator { margin-left: 6px; color: #0066cc; font-weight: bold; }

    .resizer {
        position: absolute;
        right: 0;
        top: 0;
        height: 100%;
        width: 5px;
        background: transparent;
        cursor: col-resize;
        user-select: none;
        touch-action: none;
    }

    .resizer:hover, .resizer.isResizing {
        background: #0066cc;
        opacity: 0.5;
    }

    .row-cover {
        height: 24px;
        width: auto;
        max-width: 100%;
        border-radius: 2px;
        object-fit: contain;
        display: block;
    }

    .row-cover-placeholder {
        height: 24px;
        width: 18px;
        background-color: #e0e0e0;
        border-radius: 2px;
    }

    .skeleton { pointer-events: none; }
    .skeleton-line { height: 12px; width: 80%; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading 1.5s infinite; border-radius: 4px; }
    @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
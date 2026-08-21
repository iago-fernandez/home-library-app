<script lang="ts">
    import { Settings2 } from 'lucide-svelte';
    import { bookStore } from '$lib/stores/book';
    import { t, locale } from '$lib/i18n';
    import { activeColumns, availableColumns, zoomLevel, activeDateFormat } from '$lib/stores/preferences';
    import { dialogStore } from '$lib/stores/dialog';
    import { createVirtualizer } from '@tanstack/svelte-virtual';
    import {
        createSvelteTable,
        flexRender,
        getCoreRowModel,
        type ColumnDef,
        type TableOptions,
        type SortingState
    } from 'tanstack-table-8-svelte-5';
    import { createEventDispatcher, onMount, afterUpdate, tick } from 'svelte';
    import { Search, ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-svelte';
    import DropdownSelect from './DropdownSelect.svelte';
    import { formatDate } from '$lib/utils/date';
    import { apiClient } from '$lib/api/client';

    const dispatch = createEventDispatcher();
    const totalBooks = bookStore.total;
    const selectedIds = bookStore.selectedIds;
    const localSearchActive = bookStore.localSearchActive;
    const multiSelectMode = bookStore.multiSelectMode;
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    
    let scrollContainer: HTMLDivElement;
    let headerContainer: HTMLDivElement;
    let draggedColumnId: string | null = null;
    let dragOverColumnId: string | null = null;
    let disableDrag = false;




    let lastSelectedIndex = -1;
    let sorting: SortingState = [];
    let columnSizing: Record<string, number> = {};
    let isMounted = false;

    let editingCellId: string | null = null;
    let editValue: any = '';
    let justFinishedEditing = false;


    function moveColumn(cols: string[], fromId: string, toId: string) {
        const fromIndex = cols.indexOf(fromId);
        const toIndex = cols.indexOf(toId);
        if (fromIndex < 0 || toIndex < 0) return cols;
        const newCols = [...cols];
        const [removed] = newCols.splice(fromIndex, 1);
        newCols.splice(toIndex, 0, removed);
        return newCols;
    }
    
    function cancelEdit() {

        editingCellId = null;
        justFinishedEditing = true;
        setTimeout(() => { justFinishedEditing = false; }, 150);
    }

    function focusInput(node: HTMLInputElement) {
        setTimeout(() => {
            if (node && node.focus) {
                node.focus();
                try {
                    if (node.type !== 'checkbox') node.select();
                } catch(e) {}
            }
        }, 10);
        return { destroy() {} };
    }

    function getInputType(colId: string) {
        if (['volume_in_collection', 'volume_in_series', 'page_count', 'purchase_price', 'location_position', 'rating', 'edition_number'].includes(colId)) return 'number';
        if (['purchase_date', 'date_started', 'date_finished', 'loan_date', 'expected_return_date'].includes(colId)) return 'date';
        if (['publish_date', 'original_publish_date'].includes(colId)) return 'text';
        if (['is_first_edition', 'is_loaned'].includes(colId)) return 'checkbox';
        return 'text';
    }

    function startEdit(bookId: string, colId: string, value: any) {
        if (['cover_url', 'catalog_number', 'created_at', 'updated_at'].includes(colId)) return;
        editingCellId = `${bookId}-${colId}`;
        
        const type = getInputType(colId);

        if (Array.isArray(value)) {
            editValue = value.join(', ');
        } else if (type === 'checkbox') {
            editValue = !!value;
        } else if (type === 'date' && value) {
            try { editValue = new Date(value).toISOString().split('T')[0]; }
            catch(e) { editValue = ''; }
        } else if (type === 'number') {
            editValue = value !== null && value !== undefined ? Number(value) : null;
        } else {
            editValue = value !== null && value !== undefined ? String(value) : '';
        }
    }

    async function saveEdit(bookId: string, colId: string) {
        if (!editingCellId) return;
        editingCellId = null;
        justFinishedEditing = true;
        setTimeout(() => { justFinishedEditing = false; }, 150);
        
        const book = $bookStore.find(b => b.id === bookId);
        if (!book) return;
        const rawValue = book[colId as keyof typeof book];
        const type = getInputType(colId);
        
        let originalValueFormatted: any = rawValue;
        if (Array.isArray(rawValue)) originalValueFormatted = rawValue.join(', ');
        else if (type === 'checkbox') originalValueFormatted = !!rawValue;
        else if (type === 'date' && rawValue) {
            try { originalValueFormatted = new Date(rawValue as string).toISOString().split('T')[0]; }
            catch(e) { originalValueFormatted = ''; }
        } else if (type === 'number') {
            originalValueFormatted = rawValue !== null && rawValue !== undefined ? Number(rawValue) : null;
        } else {
            originalValueFormatted = rawValue !== null && rawValue !== undefined ? String(rawValue) : '';
        }

        if (originalValueFormatted === editValue) return;

        let finalValue: any = editValue;
        const arrayFields = ['authors', 'translators', 'illustrators', 'subjects', 'genres'];

        if (arrayFields.includes(colId)) {
            finalValue = typeof editValue === 'string' ? editValue.split(',').map(s => s.trim()).filter(s => s) : [];
        } else if (type === 'date') {
            finalValue = editValue ? new Date(editValue).toISOString() : null;
        } else if (type === 'number') {
            finalValue = editValue;
        } else if (type === 'checkbox') {
            finalValue = editValue;
        }

        try {
            await bookStore.updateBooksBatch([bookId], { [colId]: finalValue });
        } catch (e) {
            console.error('Failed to update book', e);
        }
    }

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
        
        if (['publish_date', 'original_publish_date', 'purchase_date', 'date_started', 'date_finished', 'loan_date', 'expected_return_date', 'created_at', 'updated_at'].includes(colId)) {
            return formatDate(val, $activeDateFormat, $locale || 'en', colId);
        }

        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return val ? String(val) : '';
    }

    let _canvas: HTMLCanvasElement;
    function getTextWidth(text: string, font: string = '13px Inter, sans-serif') {
        if (typeof document === 'undefined') return text.length * 7;
        if (!_canvas) _canvas = document.createElement('canvas');
        const context = _canvas.getContext('2d');
        if (context) {
            context.font = font;
            return context.measureText(text).width;
        }
        return text.length * 7;
    }

    function autoSizeColumn(colId: string) {
        const headerText = ($t.grid as Record<string, string>)['col_' + colId] || availableColumns.find(c => c.id === colId)?.label || colId;
        let maxWidth = getTextWidth(headerText, '600 13px Inter, sans-serif');

        for (const book of $bookStore) {
            const val = getCellData(book, colId);
            if (val) {
                const width = getTextWidth(val, '13px Inter, sans-serif');
                if (width > maxWidth) {
                    maxWidth = width;
                }
            }
        }

        // Add padding (12px on each side + sort icon space)
        const calculatedWidth = Math.min(Math.max(Math.ceil(maxWidth) + 32, 100), 500);
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
            header: ($t.grid as Record<string, string>)['col_' + id] || (colDef ? colDef.label : id),
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
        enableSortingRemoval: true,
        onSortingChange: (updater) => {
            sorting = typeof updater === 'function' ? updater(sorting) : updater;
            if (isMounted) {
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
        estimateSize: () => 44,
        overscan: 40,
    };

    $: virtualizer = createVirtualizer(virtualizerOptions);
    $: virtualItems = $virtualizer.getVirtualItems();

    // Background sync fetches everything. No need for infinite scroll.

    let localSearchQuery = '';
    let localSearchColumn = 'all';
    let isCaseSensitive = false;
    let matchIndices: number[] = [];
    let currentMatchIndex = -1;
    let localSearchInput: HTMLInputElement;

    $: searchColumns = [
        { value: 'all', label: $t.grid.allColumns },
        ...$activeColumns.map(id => {
            const key = `col_${id}` as keyof typeof $t.grid;
            return { value: id, label: $t.grid[key] || id };
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
        if (!localSearchQuery || !$localSearchActive) {
            matchIndices = [];
            currentMatchIndex = 0;
            return;
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

    function handleScroll(e: Event) {
        if (headerContainer && scrollContainer) {
            headerContainer.scrollLeft = scrollContainer.scrollLeft;
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

    let clickTimeout: any;

    function handleRowClick(event: MouseEvent | KeyboardEvent, id: string, index: number) {
        if (justFinishedEditing) return;
        
        if (event instanceof MouseEvent) {
            if (event.detail > 1) {
                clearTimeout(clickTimeout);
                return;
            }
            const isCtrl = event.ctrlKey || event.metaKey;
            const isShift = event.shiftKey;
            clearTimeout(clickTimeout);
            clickTimeout = setTimeout(() => {
                executeRowClick(isCtrl, isShift, id, index);
            }, 200);
        } else {
            executeRowClick(event.ctrlKey || event.metaKey, event.shiftKey, id, index);
        }
    }

    function handleEmptySpaceClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.classList.contains('scroll-container') || target.classList.contains('grid-table-inner') || target.classList.contains('virtual-inner')) {
            bookStore.clearSelection();
        }
    }

    function executeRowClick(isCtrlModifier: boolean, isShiftModifier: boolean, id: string, index: number) {
        const isCtrl = $multiSelectMode || isCtrlModifier;
        const isShift = isShiftModifier;
        let newSelection = [...$selectedIds];

        if (isShift && lastSelectedIndex !== -1) {
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
</script>

<div class="table-wrapper" style="zoom: {$zoomLevel / 100}">
    <div class="column-menu-wrapper" style="position: absolute; right: 0; top: 0; height: 33px; z-index: 50; background: var(--bg-color); border-left: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); display: flex; align-items: center;">
        <button class="icon-btn-small" on:click={() => dispatch('openSettings', 'workspace')} style="height: 100%; padding: 0 12px; border-radius: 0; display: flex; align-items: center; justify-content: center; background: transparent; border: none; cursor: pointer; color: var(--text-muted);" title="{$t.menu.settings}">
            <Settings2 size={16} />
        </button>
    </div>

    <div bind:this={headerContainer} class="grid-header-container">
        <div class="grid-table-inner" style="min-width: 100%; width: {$table.getTotalSize()}px">
            <div class="grid-header">
                {#each $table.getHeaderGroups() as headerGroup}
                    <div class="header-row">
                        {#each headerGroup.headers as header}
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                    class="cell header-cell sortable {dragOverColumnId === header.column.id ? 'drag-over' : ''}"
                                    style="width: {header.getSize()}px"
                                    role="button"
                                    tabindex="0"
                                    draggable={!disableDrag}
                                    on:click={header.column.getToggleSortingHandler()}
                                    on:keydown={(e) => e.key === 'Enter' && header.column.toggleSorting()}
                                    on:dragstart={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.classList.contains('resizer')) {
                                            e.preventDefault();
                                            return;
                                        }
                                        if(e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; 
                                        draggedColumnId = header.column.id; 
                                    }}
                                    on:dragover={(e) => { if(header.column.id !== draggedColumnId) { e.preventDefault(); dragOverColumnId = header.column.id; } }}
                                    on:dragleave={() => { if(dragOverColumnId === header.column.id) dragOverColumnId = null; }}
                                    on:drop={(e) => {
                                        e.preventDefault();
                                        if (draggedColumnId && dragOverColumnId && draggedColumnId !== dragOverColumnId) {
                                            $activeColumns = moveColumn($activeColumns, draggedColumnId, dragOverColumnId);
                                        }
                                        draggedColumnId = null;
                                        dragOverColumnId = null;
                                    }}
                                    on:dragend={() => { draggedColumnId = null; dragOverColumnId = null; }}
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
                                            draggable="false"
                                            on:mouseenter={() => disableDrag = true}
                                            on:mouseleave={() => disableDrag = false}
                                            on:dragstart|preventDefault|stopPropagation
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
        </div>
    </div>

    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div style="position: relative; flex: 1; display: flex; flex-direction: column; min-height: 0;">
        {#if $bookStore.length === 0}
            <div class="empty-state">
                <p>{$t.common.emptyLibrary}</p>
            </div>
        {/if}
        <div bind:this={scrollContainer} class="scroll-container" on:scroll={handleScroll} on:click={handleEmptySpaceClick}>
            <div class="grid-table-inner" style="min-width: 100%; width: {$table.getTotalSize()}px">
                {#if $bookStore.length > 0}
                    <div class="virtual-inner" style="height: {$virtualizer.getTotalSize()}px; position: relative;">
                        {#each virtualItems as virtualRow (virtualRow.index)}
                        {@const row = $table.getRowModel().rows[virtualRow.index]}
                    {#if row}
                        <div
                                class="grid-row"
                                class:selected={$selectedIds.includes(row.original.id)}
                                class:is-editing-row={editingCellId && editingCellId.startsWith(`${row.original.id}-`)}
                                style="transform: translateY({virtualRow.start}px); height: {virtualRow.size}px; min-width: 100%; width: {$table.getTotalSize()}px"
                                role="button" tabindex="0"
                                on:click={(e) => handleRowClick(e, row.original.id, virtualRow.index)}
                                on:keydown={(e) => e.key === 'Enter' && handleRowClick(e, row.original.id, virtualRow.index)}
                        >
                            {#each row.getVisibleCells() as cell}
                                <div class="cell" class:is-editing={editingCellId === `${row.original.id}-${cell.column.id}`} style="width: {cell.column.getSize()}px" on:dblclick={(e) => { e.stopPropagation(); startEdit(row.original.id, cell.column.id, cell.getValue()); }}>
                                    {#if editingCellId === `${row.original.id}-${cell.column.id}`}
                                        {#if getInputType(cell.column.id) === 'checkbox'}
                                            <input type="checkbox" class="inline-edit-checkbox" bind:checked={editValue} on:blur={() => saveEdit(row.original.id, cell.column.id)} on:keydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); e.currentTarget.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); cancelEdit(); } }} on:click={(e) => e.stopPropagation()} use:focusInput />
                                        {:else}
                                            <input type={getInputType(cell.column.id)} class="inline-edit-input" bind:value={editValue} on:blur={() => saveEdit(row.original.id, cell.column.id)} on:keydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); e.currentTarget.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); cancelEdit(); } }} on:click={(e) => e.stopPropagation()} use:focusInput />
                                        {/if}
                                    {:else if cell.column.id === 'cover_url'}
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
                {/if}
            </div>
        </div>
    </div>

    {#if $localSearchActive}
        <div class="local-search-bar">
            <Search size={16} color="var(--text-muted)" />
            <div style="width: 210px;">
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
    .column-menu-wrapper {
        position: relative;
        display: flex;
    }

    .drag-over {
        background-color: var(--primary-color) !important;
        opacity: 0.2;
    }

    .table-wrapper { display: flex; flex-direction: column; flex: 1; min-height: 0; background-color: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; transition: border-color 0.2s; position: relative; }
    
    .grid-header-container {
        overflow-x: hidden;
        overflow-y: scroll;
        flex-shrink: 0;
        background-color: var(--bg-color);
        border-bottom: 1px solid var(--border-color);
        scrollbar-width: auto;
        scrollbar-color: transparent var(--bg-color);
    }
    
    .grid-header-container::-webkit-scrollbar-thumb {
        background-color: transparent !important;
        border-color: transparent !important;
    }
    
    .grid-header-container::-webkit-scrollbar-track {
        background-color: var(--bg-color) !important;
    }
    .local-search-bar { display: flex; align-items: center; background-color: var(--bg-color); border-top: 1px solid var(--border-color); padding: 4px 8px; gap: 8px; box-shadow: 0 -2px 4px rgba(0,0,0,0.02); z-index: 10; flex-shrink: 0; }
    .local-search-bar input { border: none; outline: none; flex: 1; font-family: inherit; font-size: 13px; padding: 4px; background-color: transparent; color: var(--text-main); }
    .match-count { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
    .no-matches { color: var(--danger-color); }
    .nav-buttons { display: flex; }
    .icon-btn-small { background: transparent; border: none; cursor: pointer; padding: 4px; color: var(--text-muted); border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background-color 0.1s; }
    .icon-btn-small:hover:not(:disabled):not(.active) { background-color: var(--secondary-color); }
    .icon-btn-small.active { background-color: var(--primary-color); color: #ffffff; }
    .icon-btn-small.active:hover { background-color: var(--primary-hover); }
    .icon-btn-small:disabled { opacity: 0.3; cursor: not-allowed; }
    .divider { width: 1px; height: 16px; background-color: var(--border-color); margin: 0 4px; }


    .scroll-container { flex: 1; overflow: auto; position: relative; border-bottom-left-radius: 3px; border-bottom-right-radius: 3px; overscroll-behavior-x: contain; }
    
    :global(.animating-panel .scroll-container) { 
        overflow-x: hidden !important; 
        scrollbar-width: none !important;
    }
    :global(.animating-panel .scroll-container::-webkit-scrollbar:horizontal) {
        display: none !important;
        height: 0 !important;
    }
    
    .grid-table-inner { position: relative; min-height: 100%; will-change: transform; transform: translateZ(0); }

    .grid-header {
        background-color: var(--bg-color);
        font-weight: 500;
        font-size: 13px;
        color: var(--text-main);
    }

    .header-row { display: flex; min-width: 100%; }
    .virtual-inner { position: relative; }
    
    .empty-state {
        padding: 100px 24px;
        color: var(--text-muted);
        font-size: 15px;
        width: 100%;
        text-align: center;
    }

    .empty-state p {
        position: sticky;
        left: 50%;
        transform: translateX(-50%);
        display: inline-block;
        margin: 0;
    }

    .grid-row {
        position: absolute;
        top: 0;
        left: 0;
        display: flex;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
        color: var(--text-main);
        background-color: var(--panel-bg);
        box-sizing: border-box;
        cursor: pointer;
        user-select: none;
    }

    .inline-edit-input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        border: none;
        background: var(--bg-color);
        color: var(--text-main);
        padding: 0 12px;
        font-family: inherit;
        font-size: 13px;
        outline: none !important;
        box-shadow: inset 0 0 0 2px var(--primary-color);
        z-index: 20;
    }

    .inline-edit-checkbox {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        cursor: pointer;
        accent-color: var(--primary-color);
        z-index: 10;
    }

    .grid-row:focus { outline: none; }
    .grid-row:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
    .grid-row:hover { background-color: var(--bg-color); }
    .grid-row.selected { background-color: var(--secondary-color); }
    .grid-row.is-editing-row { z-index: 10; }

    .cell {
        padding: 8px 12px;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        position: relative;
        display: flex;
        align-items: center;
        outline: none;
    }
    
    .cell.is-editing {
        overflow: visible;
        z-index: 10;
    }

    .header-cell { user-select: none; }
    .header-cell:focus-visible { box-shadow: inset 0 0 0 2px var(--primary-color); outline: none; border-radius: 2px; }

    .sortable { cursor: pointer; transition: background-color 0.1s; }
    .sortable:hover { background-color: var(--border-color); }

    .sort-indicator { margin-left: 6px; color: var(--primary-color); font-weight: 600; }

    .resizer {
        position: absolute;
        right: 0;
        top: 0;
        height: 100%;
        width: 5px;
        background: transparent;
        cursor: ew-resize;
        user-select: none;
        touch-action: none;
    }

    .resizer:hover, :global(.match-highlight) {
        background: var(--primary-color);
        color: #ffffff;
    }

    .resizer.isResizing {
        background: var(--primary-color);
        opacity: 0.5;
    }

    .row-cover {
        height: 30px;
        width: auto;
        max-width: 100%;
        border-radius: 2px;
        object-fit: contain;
        display: block;
    }

    .row-cover-placeholder {
        height: 30px;
        width: 22px;
        background-color: #e0e0e0;
        border-radius: 2px;
    }

    .skeleton { pointer-events: none; }
    .skeleton-line { height: 12px; width: 80%; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading 1.5s infinite; border-radius: 4px; }
    @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
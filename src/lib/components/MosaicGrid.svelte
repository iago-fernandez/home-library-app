<script lang="ts">
    import { bookStore } from '$lib/stores/book';
    import { activeMosaicAttributes, zoomLevel } from '$lib/stores/preferences';
    import BookCover from './BookCover.svelte';
    import { Search, ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-svelte';
    import DropdownSelect from './DropdownSelect.svelte';
    import { t, locale } from '$lib/i18n';
    import { activeColumns, availableColumns, activeDateFormat } from '$lib/stores/preferences';
    import { tick, onMount } from 'svelte';
    import { createVirtualizer } from '@tanstack/svelte-virtual';
    import { dialogStore } from '$lib/stores/dialog';
    import { formatDate } from '$lib/utils/date';

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
        
        if (['publish_date', 'original_publish_date', 'purchase_date', 'date_started', 'date_finished', 'loan_date', 'expected_return_date', 'created_at', 'updated_at'].includes(attrId)) {
            return formatDate(val, $activeDateFormat, $locale || 'en');
        }

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
    let scrollContainer: HTMLDivElement | undefined;
    let containerWidth = 1000;
    
    // We use a fixed base width for columns to calculate how many fit
    $: itemsPerRow = Math.max(1, Math.floor(containerWidth / (160 + 16)));
    
    $: rowChunks = books.reduce((resultArray, item, index) => { 
        const chunkIndex = Math.floor(index / itemsPerRow);
        if(!resultArray[chunkIndex]) {
            resultArray[chunkIndex] = [];
        }
        resultArray[chunkIndex].push(item);
        return resultArray;
    }, [] as any[][]);

    $: rowHeight = 270 + ($activeMosaicAttributes.length * 24);
    
    let virtualizerOptions: any;
    $: virtualizerOptions = {
        count: rowChunks.length,
        getScrollElement: () => scrollContainer,
        estimateSize: () => rowHeight,
        overscan: 10,
    };

    $: virtualizer = createVirtualizer(virtualizerOptions);
    $: virtualItems = $virtualizer.getVirtualItems();
$: searchColumns = [
        { value: 'all', label: $t.grid.allColumns },
        ...$activeMosaicAttributes.map(id => {
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
    

    function handleEmptySpaceClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (target.classList.contains('mosaic-wrapper') || target.classList.contains('mosaic-container')) {
            bookStore.clearSelection();
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="mosaic-wrapper" on:click={handleEmptySpaceClick}>
    
    <div class="mosaic-container" bind:this={scrollContainer} bind:clientWidth={containerWidth} style="zoom: {$zoomLevel / 100}">
        {#if books.length === 0}
            <div class="empty-state">
                <p>{$t.common.emptyLibrary}</p>
            </div>
        {:else}
            <div style="height: {$virtualizer.getTotalSize()}px; width: 100%; position: relative;">
                {#each virtualItems as virtualRow (virtualRow.index)}
                    {@const row = rowChunks[virtualRow.index]}
                    <div 
                        style="position: absolute; top: 0; left: 0; width: 100%; transform: translateY({virtualRow.start}px); display: grid; grid-template-columns: repeat({itemsPerRow}, minmax(0, 1fr)); gap: 16px; padding: 16px; box-sizing: border-box;"
                        data-index={virtualRow.index}
                    >
                        {#each row as book (book.id)}
                            {@const index = books.indexOf(book)}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
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
                                    {#if book.authors}
                                        <p class="attr-text authors-text" title={formatAttribute(book, 'authors')}>{formatAttribute(book, 'authors')}</p>
                                    {/if}
                                    <div class="attributes-list">
                                        {#each $activeMosaicAttributes.filter(id => id !== 'title' && id !== 'authors') as attrId}
                                            {#if formatAttribute(book, attrId)}
                                                <p class="attr-text" title={formatAttribute(book, attrId)}>{formatAttribute(book, attrId)}</p>
                                            {/if}
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/each}
            </div>
        {/if}
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
        flex: 1;
        min-height: 0;
        height: 100%;
        background-color: var(--bg-color);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        overflow: hidden;
        transition: border-color 0.2s;
    }
    .mosaic-container {
        display: grid;
        /* Layout managed by virtualizer */
        overflow-y: auto;
        flex: 1;
        background-color: var(--bg-color);
        box-sizing: border-box;
    }
    .empty-state {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 48px 24px;
        color: var(--text-muted);
        font-size: 14px;
        text-align: center;
        height: 100%;
        min-height: 200px;
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
    .local-search-bar input { border: none; outline: none; flex: 1; font-family: inherit; font-size: 13px; padding: 4px; background-color: transparent; color: var(--text-main); }
    .match-count { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
    .no-matches { color: var(--danger-color); }
    .nav-buttons { display: flex; }
    .icon-btn-small { background: transparent; border: none; cursor: pointer; padding: 4px; color: var(--text-muted); border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: background-color 0.1s; }
    .icon-btn-small:hover:not(:disabled) { background-color: var(--secondary-color); }
    .icon-btn-small.active { background-color: var(--primary-color); color: #ffffff; }
    .icon-btn-small.active:hover { background-color: var(--primary-hover); }
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
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .authors-text {
        font-weight: 500;
        color: var(--primary-color) !important;
        margin-bottom: 8px !important;
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
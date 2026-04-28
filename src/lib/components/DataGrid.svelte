<script lang="ts">
    import { bookStore } from '$lib/store';
    import { createVirtualizer } from '@tanstack/svelte-virtual';

    const totalBooks = bookStore.total;

    let scrollContainer: HTMLDivElement;

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
        if (lastItem && lastItem.index >= $bookStore.length - 10) {
            bookStore.loadBooks();
        }
    }
</script>

<div class="table-wrapper">
    <div class="grid-header">
        <div class="cell">Title</div>
        <div class="cell">Authors</div>
        <div class="cell">Publisher</div>
        <div class="cell">Date</div>
        <div class="cell">ISBN</div>
        <div class="cell">Room</div>
        <div class="cell">Bookcase</div>
    </div>

    <div bind:this={scrollContainer} class="scroll-container">
        <div class="virtual-inner" style="height: {$virtualizer.getTotalSize()}px;">
            {#each virtualItems as virtualRow (virtualRow.index)}
                {@const book = $bookStore[virtualRow.index]}
                {#if book}
                    <div
                            class="grid-row"
                            style="transform: translateY({virtualRow.start}px); height: {virtualRow.size}px;"
                    >
                        <div class="cell">{book.title}</div>
                        <div class="cell">{book.authors.join(', ')}</div>
                        <div class="cell">{book.publisher || ''}</div>
                        <div class="cell">{book.publish_date || ''}</div>
                        <div class="cell">{book.isbn_13 || ''}</div>
                        <div class="cell">{book.location_room || ''}</div>
                        <div class="cell">{book.location_bookcase || ''}</div>
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
    }

    .grid-header {
        display: grid;
        grid-template-columns: 2fr 2fr 1.5fr 1fr 1.5fr 1fr 1fr;
        background-color: #f5f5f5;
        border-bottom: 1px solid #ccc;
        font-weight: 600;
        font-size: 13px;
        color: #333;
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
    }

    .grid-row:hover {
        background-color: #f9f9f9;
    }

    .cell {
        padding: 8px 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
    }
</style>
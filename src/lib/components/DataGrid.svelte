<script lang="ts">
    import { bookStore } from '$lib/store';
</script>

<div class="grid-container">
    <table class="data-table">
        <thead>
        <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Publisher</th>
            <th>Year</th>
            <th>ISBN</th>
            <th>Room</th>
            <th>Bookcase</th>
        </tr>
        </thead>
        <tbody>
        {#each $bookStore as book (book.id)}
            <tr>
                <td class="cell-title">{book.title}</td>
                <td>{book.authors.join(', ')}</td>
                <td>{book.publisher || ''}</td>
                <td>{book.publish_date || ''}</td>
                <td>{book.isbn_13 || book.isbn_10 || ''}</td>
                <td>{book.location_room || ''}</td>
                <td>{book.location_bookcase || ''}</td>
            </tr>
        {/each}
        {#if $bookStore.length === 0}
            <tr>
                <td colspan="7" class="empty-state">No records found in the database.</td>
            </tr>
        {/if}
        </tbody>
    </table>
</div>

<style>
    .grid-container {
        height: 100%;
        overflow: auto;
        background-color: #ffffff;
        border: 1px solid #ccc;
    }

    .data-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 13px;
    }

    th {
        position: sticky;
        top: 0;
        background-color: #f0f0f0;
        border-bottom: 1px solid #ccc;
        border-right: 1px solid #ccc;
        padding: 6px 12px;
        font-weight: 600;
        z-index: 1;
        user-select: none;
    }

    td {
        padding: 6px 12px;
        border-bottom: 1px solid #eee;
        border-right: 1px solid #eee;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
    }

    .cell-title {
        max-width: 250px;
        font-weight: 500;
    }

    tr:hover td {
        background-color: #f5f8ff;
        cursor: pointer;
    }

    .empty-state {
        text-align: center;
        padding: 24px;
        color: #666;
        font-style: italic;
    }
</style>
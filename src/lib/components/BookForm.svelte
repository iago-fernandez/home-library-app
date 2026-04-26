<script lang="ts">
    import type { CreateBookPayload } from '$lib/types/book';
    import AutoExpandTextarea from './AutoExpandTextarea.svelte';

    export let onCancel: () => void;
    export let onSubmit: (payload: CreateBookPayload) => void;

    let formData: Partial<CreateBookPayload> = {
        title: '',
        authors: [],
        publisher: '',
        publish_date: '',
        isbn_13: '',
        location_room: '',
        location_bookcase: '',
    };

    let authorsInput = '';

    function handleSubmit() {
        formData.authors = authorsInput.split(',').map(a => a.trim()).filter(a => a.length > 0);
        onSubmit(formData as CreateBookPayload);
    }
</script>

<form class="book-form" on:submit|preventDefault={handleSubmit}>
    <div class="form-header">
        <h3>Add New Book</h3>
        <div class="header-actions">
            <button type="button" class="btn-cancel" on:click={onCancel}>Cancel</button>
            <button type="submit" class="btn-submit">Save</button>
        </div>
    </div>

    <div class="form-scroll-area">
        <fieldset class="form-group">
            <legend>Essential Information</legend>

            <div class="input-row">
                <label for="title">Title</label>
                <AutoExpandTextarea id="title" bind:value={formData.title} required={true} />
            </div>

            <div class="input-row">
                <label for="authors">Authors</label>
                <AutoExpandTextarea id="authors" bind:value={authorsInput} required={true} />
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>Publication Details</legend>

            <div class="input-row">
                <label for="publisher">Publisher</label>
                <input type="text" id="publisher" bind:value={formData.publisher} />
            </div>

            <div class="input-row">
                <label for="publish_date">Publication Date</label>
                <input type="text" id="publish_date" bind:value={formData.publish_date} />
            </div>

            <div class="input-row">
                <label for="isbn_13">ISBN-13</label>
                <input type="text" id="isbn_13" bind:value={formData.isbn_13} />
            </div>
        </fieldset>

        <fieldset class="form-group">
            <legend>Physical Location</legend>

            <div class="input-row">
                <label for="room">Room</label>
                <input type="text" id="room" bind:value={formData.location_room} />
            </div>

            <div class="input-row">
                <label for="bookcase">Bookcase</label>
                <input type="text" id="bookcase" bind:value={formData.location_bookcase} />
            </div>
        </fieldset>
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
    }

    .btn-submit {
        background-color: #0066cc;
        color: #ffffff;
        border-color: #005bb5;
        font-weight: 500;
    }

    .form-scroll-area {
        flex: 1;
        overflow-y: auto;
        padding-right: 8px;
        display: flex;
        flex-direction: column;
        gap: 24px;
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
        color: #555;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        padding: 0;
    }

    .input-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    label {
        font-size: 13px;
        font-weight: 500;
        color: #333;
    }

    input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-family: inherit;
        font-size: 13px;
        box-sizing: border-box;
    }

    input:focus {
        outline: none;
        border-color: #0066cc;
    }
</style>
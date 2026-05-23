<script lang="ts">
    export let value: string = '';
    export let id: string = '';
    export let required: boolean = false;

    let textareaElement: HTMLTextAreaElement;

    function resize() {
        if (textareaElement) {
            textareaElement.style.height = 'auto';
            textareaElement.style.height = textareaElement.scrollHeight + 'px';
        }
    }

    $: if (value !== undefined) {
        setTimeout(resize, 0);
    }
</script>

<textarea
        {id}
        bind:value
        {required}
        bind:this={textareaElement}
        on:input={resize}
        rows="1"
></textarea>

<style>
    textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-family: inherit;
        font-size: 13px;
        box-sizing: border-box;
        resize: none;
        overflow: hidden;
        min-height: 35px;
    }

    textarea:focus {
        outline: none;
        border-color: var(--input-focus);
        box-shadow: 0 0 0 2px var(--focus-ring);
    }
</style>
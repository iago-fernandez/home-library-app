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
        border: 1px solid var(--border-color, #cbd5e1);
        border-radius: 4px;
        font-family: inherit;
        font-size: 13px;
        box-sizing: border-box;
        background-color: var(--panel-bg, #ffffff);
        color: var(--text-main, #334155);
        resize: none;
        overflow: hidden;
        min-height: 35px;
        margin: 0;
        outline: 2px solid transparent;
        outline-offset: 0px;
        transition: border-color 0.2s, outline-color 0.2s;
    }

    textarea:focus {
        outline: 2px solid var(--focus-ring, rgba(59, 130, 246, 0.2));
        outline-offset: 0px;
        border-color: var(--input-focus, #3b82f6);
    }
</style>
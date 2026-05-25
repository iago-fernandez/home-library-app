<script lang="ts">
    import AutocompleteDropdown from './AutocompleteDropdown.svelte';

    export let value: string = '';
    export let id: string = '';
    export let required: boolean = false;
    export let autocompleteField: string | null = null;

    let textareaElement: HTMLTextAreaElement;
    let containerElement: HTMLDivElement;
    let isAutocompleteOpen = false;
    let autocompleteComponent: AutocompleteDropdown;

    function resize() {
        if (textareaElement) {
            textareaElement.style.height = 'auto';
            textareaElement.style.height = textareaElement.scrollHeight + 'px';
        }
    }

    $: if (value !== undefined) {
        setTimeout(resize, 0);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (isAutocompleteOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Escape' || event.key === 'Enter')) {
            autocompleteComponent.handleKeydown(event);
        }
    }

    function handleInput() {
        resize();
        if (autocompleteField) {
            isAutocompleteOpen = true;
        }
    }

    let blurTimer: ReturnType<typeof setTimeout>;

    function handleFocus() {
        clearTimeout(blurTimer);
        if (autocompleteField) {
            isAutocompleteOpen = true;
        }
    }

    function handleBlur() {
        blurTimer = setTimeout(() => {
            isAutocompleteOpen = false;
        }, 150);
    }

    function handleSelect(event: CustomEvent<string>) {
        value = event.detail;
        isAutocompleteOpen = false;
        textareaElement.focus();
    }
</script>

<div class="textarea-wrapper" bind:this={containerElement}>
    <textarea
            {id}
            bind:value
            {required}
            bind:this={textareaElement}
            on:input={handleInput}
            on:focus={handleFocus}
            on:blur={handleBlur}
            on:keydown={handleKeydown}
            rows="1"
            autocomplete="off"
    ></textarea>
    
    {#if autocompleteField}
        <AutocompleteDropdown
            bind:this={autocompleteComponent}
            field={autocompleteField}
            query={value}
            bind:isOpen={isAutocompleteOpen}
            topOffset={containerElement ? containerElement.offsetHeight + 2 : 0}
            on:select={handleSelect}
        />
    {/if}
</div>

<style>
    .textarea-wrapper {
        position: relative;
        width: 100%;
        display: flex;
    }

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
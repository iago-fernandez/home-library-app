<script lang="ts">
    import { X } from 'lucide-svelte';

    import AutocompleteDropdown from './AutocompleteDropdown.svelte';

    export let id: string;
    export let values: string[] = [];
    export let placeholder: string = '';
    export let autocompleteField: string | null = null;

    let inputValue = '';
    let inputElement: HTMLInputElement;
    let containerElement: HTMLDivElement;
    let isAutocompleteOpen = false;
    let autocompleteComponent: AutocompleteDropdown;

    function handleKeydown(event: KeyboardEvent) {
        if (isAutocompleteOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Escape')) {
            autocompleteComponent.handleKeydown(event);
            return;
        }

        if (event.key === 'Enter') {
            if (isAutocompleteOpen) {
                autocompleteComponent.handleKeydown(event);
                return;
            }
            event.preventDefault();
            const trimmed = inputValue.trim();
            if (trimmed && !values.includes(trimmed)) {
                values = [...values, trimmed];
                inputValue = '';
            }
        } else if (event.key === 'Backspace' && inputValue === '' && values.length > 0) {
            values = values.slice(0, -1);
        }
    }

    function removeValue(indexToRemove: number) {
        values = values.filter((_, index) => index !== indexToRemove);
        inputElement.focus();
    }

    function handleInput() {
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

    function handleBlur(e: FocusEvent) {
        // Delay closing so that click events on the dropdown can fire
        blurTimer = setTimeout(() => {
            isAutocompleteOpen = false;
        }, 150);
    }

    function handleSelect(event: CustomEvent<string>) {
        const selected = event.detail.trim();
        if (selected && !values.includes(selected)) {
            values = [...values, selected];
            inputValue = '';
        }
        inputElement.focus();
    }
</script>

<div
        class="chip-input-container"
        bind:this={containerElement}
        role="button"
        tabindex="0"
        on:click={() => inputElement.focus()}
        on:keydown={(e) => e.key === 'Enter' && inputElement.focus()}
>
    {#each values as val, index}
        <div class="chip">
            <span class="chip-text">{val}</span>
            <button type="button" class="chip-remove" on:click|stopPropagation={() => removeValue(index)}>
                <X size={12} strokeWidth={2.5} />
            </button>
        </div>
    {/each}
    <input
            bind:this={inputElement}
            {id}
            type="text"
            bind:value={inputValue}
            on:keydown={handleKeydown}
            on:input={handleInput}
            on:focus={handleFocus}
            on:blur={handleBlur}
            {placeholder}
            class="chip-input"
            autocomplete="off"
    />
    {#if autocompleteField}
        <AutocompleteDropdown
            bind:this={autocompleteComponent}
            field={autocompleteField}
            query={inputValue}
            bind:isOpen={isAutocompleteOpen}
            topOffset={containerElement ? containerElement.offsetHeight + 2 : 0}
            on:select={handleSelect}
        />
    {/if}
</div>

<style>
    .chip-input-container {
        position: relative;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 4px 8px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background-color: var(--panel-bg);
        min-height: 35px;
        align-items: center;
        cursor: text;
        transition: border-color 0.2s, outline-color 0.2s;
        outline: 2px solid transparent;
        outline-offset: 0px;
    }

    .chip-input-container:focus-within {
        outline: 2px solid var(--focus-ring);
        outline-offset: 0px;
        border-color: var(--input-focus);
    }

    .chip {
        display: flex;
        align-items: center;
        background-color: var(--secondary-color);
        border: 1px solid color-mix(in srgb, var(--primary-color) 40%, transparent);
        border-radius: 16px;
        padding: 2px 6px 2px 10px;
        font-size: 12px;
        color: var(--text-main);
        gap: 4px;
    }

    .chip-text {
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .chip-remove {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        color: var(--text-main);
        cursor: pointer;
        padding: 0;
        transition: background-color 0.1s;
    }

    .chip-remove:hover {
        background-color: var(--bg-color);
        color: var(--danger-color);
    }

    .chip-input {
        flex: 1;
        min-width: 120px;
        border: none;
        outline: none;
        background: transparent;
        font-family: inherit;
        font-size: 13px;
        color: var(--text-main);
        padding: 4px 0;
        margin: 0;
    }
</style>
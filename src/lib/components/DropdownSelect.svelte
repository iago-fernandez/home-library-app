<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { ChevronDown } from 'lucide-svelte';

    export let options: { value: string, label: string }[] = [];
    export let value: string = '';
    export let placeholder: string = 'Select...';
    export let id: string = '';
    export let customClass: string = '';
    export let direction: 'down' | 'up' = 'down';
    export let align: 'left' | 'right' = 'left';

    const dispatch = createEventDispatcher();
    let isOpen = false;
    let selectElement: HTMLDivElement;

    $: selectedLabel = options.find(o => o.value === value)?.label || placeholder;


    let focusedIndex = -1;
    let searchString = '';
    let searchTimeout: ReturnType<typeof setTimeout>;

    function toggleOpen() {
        isOpen = !isOpen;
        if (isOpen) {
            focusedIndex = options.findIndex(o => o.value === value);
            if (focusedIndex === -1) focusedIndex = 0;
            scrollToFocused();
        }
    }

    function selectOption(optionValue: string) {
        value = optionValue;
        isOpen = false;
        dispatch('change', { value });
    }

    function scrollToFocused() {
        setTimeout(() => {
            if (selectElement && isOpen && focusedIndex >= 0) {
                const optionsEl = selectElement.querySelectorAll('.select-option');
                if (optionsEl[focusedIndex]) {
                    optionsEl[focusedIndex].scrollIntoView({ block: 'nearest' });
                }
            }
        }, 10);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!isOpen) {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
                event.preventDefault();
                toggleOpen();
            }
            return;
        }

        if (event.key === 'Escape') {
            isOpen = false;
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusedIndex = Math.min(focusedIndex + 1, options.length - 1);
            scrollToFocused();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusedIndex = Math.max(focusedIndex - 1, 0);
            scrollToFocused();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < options.length) {
                selectOption(options[focusedIndex].value);
            }
        } else if (event.key.length === 1) {
            searchString += event.key.toLowerCase();
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => searchString = '', 500);
            
            const matchIndex = options.findIndex(o => o.label.toLowerCase().startsWith(searchString));
            if (matchIndex >= 0) {
                focusedIndex = matchIndex;
                scrollToFocused();
            }
        }
    }

    function handleWindowClick(event: MouseEvent) {

        if (isOpen && selectElement && !selectElement.contains(event.target as Node)) {
            isOpen = false;
        }
    }

</script>

<svelte:window on:click={handleWindowClick}  />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="custom-select {customClass}" bind:this={selectElement} {id} on:keydown={handleKeydown}>
    <button type="button" class="select-button" on:click={toggleOpen}>
        <span class="select-label">{selectedLabel}</span>
        <ChevronDown size={14} class="select-icon {isOpen ? 'open' : ''}" />
    </button>

    {#if isOpen}
        <div class="select-dropdown" class:up={direction === 'up'} class:align-right={align === 'right'}>
                        {#each options as option, i}
                <button
                    type="button"
                    class="select-option"
                    class:selected={option.value === value}
                    class:focused={i === focusedIndex}
                    on:click={() => selectOption(option.value)}
                    on:mouseenter={() => focusedIndex = i}
                >
                    {option.label}
                </button>
            {/each}
        </div>
    {/if}
</div>

<style>
    .custom-select {
        position: relative;
        display: inline-block;
        width: 100%;
    }

    .select-button {
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 6px 8px;
        background-color: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--text-main);
        font-size: 13px;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: all 0.2s ease;
    }

    .select-button:focus, .select-button:hover {
        border-color: var(--input-focus);
    }

    .select-button:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--focus-ring);
    }

    .select-label {
        flex: 1 1 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :global(.select-icon) {
        flex: 0 0 auto;
        margin-left: 8px;
        color: var(--text-muted);
        transition: transform 0.2s ease;
    }

    :global(.select-icon.open) {
        transform: rotate(180deg);
    }

    .select-dropdown {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        min-width: 100%;
        width: max-content;
        background-color: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-height: 250px;
        overflow-y: auto;
        padding: 4px;
        animation: fadeIn 0.15s ease-out;
    }

    .select-dropdown.up {
        top: auto;
        bottom: calc(100% + 4px);
        transform-origin: bottom;
    }

    .select-dropdown.align-right {
        left: auto;
        right: 0;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .select-option {
        display: block;
        width: 100%;
        text-align: left;
        padding: 6px 10px;
        background: transparent;
        border: none;
        border-radius: 4px;
        font-size: 13px;
        color: var(--text-main);
        cursor: pointer;
        transition: background-color 0.15s ease;
        white-space: nowrap;
    }

    .select-option:hover {
        background-color: var(--bg-color);
    }

    .select-option.selected {
        background-color: var(--primary-color);
        color: white;
    }
    
    .select-option.focused:not(.selected) {
        background-color: var(--bg-color);
        outline: 1px solid var(--primary-color);
    }
</style>

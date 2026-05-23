<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { ChevronDown } from 'lucide-svelte';

    export let options: { value: string, label: string }[] = [];
    export let value: string = '';
    export let placeholder: string = 'Select...';
    export let id: string = '';
    export let customClass: string = '';
    export let direction: 'down' | 'up' = 'down';

    const dispatch = createEventDispatcher();
    let isOpen = false;
    let selectElement: HTMLDivElement;

    $: selectedLabel = options.find(o => o.value === value)?.label || placeholder;

    function toggleOpen() {
        isOpen = !isOpen;
    }

    function selectOption(optionValue: string) {
        value = optionValue;
        isOpen = false;
        dispatch('change', { value });
    }

    function handleWindowClick(event: MouseEvent) {
        if (isOpen && selectElement && !selectElement.contains(event.target as Node)) {
            isOpen = false;
        }
    }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="custom-select {customClass}" bind:this={selectElement} {id}>
    <button type="button" class="select-button" on:click={toggleOpen}>
        <span class="select-label">{selectedLabel}</span>
        <ChevronDown size={14} class="select-icon {isOpen ? 'open' : ''}" />
    </button>

    {#if isOpen}
        <div class="select-dropdown" class:up={direction === 'up'}>
            {#each options as option}
                <button
                    type="button"
                    class="select-option"
                    class:selected={option.value === value}
                    on:click={() => selectOption(option.value)}
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
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :global(.select-icon) {
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
        width: 100%;
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
    }

    .select-option:hover {
        background-color: var(--bg-color);
    }

    .select-option.selected {
        background-color: var(--primary-color);
        color: white;
    }
</style>

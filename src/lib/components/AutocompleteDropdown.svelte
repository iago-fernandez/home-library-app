<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { apiClient } from '../api/client';
    import { autocompleteLimit } from '../stores/preferences';
    
    export let field: string;
    export let query: string = '';
    export let isOpen: boolean = false;
    export let topOffset: number = 0;
    
    const dispatch = createEventDispatcher<{ select: string }>();
    
    let suggestions: string[] = [];
    let loading = false;
    let selectedIndex = -1;
    let debounceTimer: ReturnType<typeof setTimeout>;
    
    $: if (isOpen) {
        fetchSuggestions(query);
    } else {
        suggestions = [];
        selectedIndex = -1;
    }
    
    function fetchSuggestions(q: string) {
        if ($autocompleteLimit <= 0) {
            suggestions = [];
            return;
        }
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (!field) return;
            loading = true;
            try {
                const results = await apiClient.getAutocomplete(field, q, $autocompleteLimit);
                suggestions = results.filter(r => r.toLowerCase() !== q.toLowerCase());
                selectedIndex = -1;
            } catch (e) {
                console.error('Error fetching autocomplete:', e);
            } finally {
                loading = false;
            }
        }, 300);
    }
    
    export function handleKeydown(event: KeyboardEvent) {
        if (!isOpen || suggestions.length === 0) return;
        
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedIndex = (selectedIndex + 1) % suggestions.length;
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
            event.preventDefault();
            selectSuggestion(suggestions[selectedIndex]);
        } else if (event.key === 'Escape') {
            isOpen = false;
        }
    }
    
    function selectSuggestion(suggestion: string) {
        dispatch('select', suggestion);
    }
</script>

{#if isOpen && (suggestions.length > 0 || loading)}
    <ul class="autocomplete-dropdown" style="top: {topOffset}px">
        {#if loading && suggestions.length === 0}
            <li class="loading">Loading...</li>
        {:else}
            {#each suggestions as suggestion, i}
                <li 
                    class:selected={i === selectedIndex}
                    on:mousedown|preventDefault={() => selectSuggestion(suggestion)}
                    on:mouseenter={() => selectedIndex = i}
                >
                    {suggestion}
                </li>
            {/each}
        {/if}
    </ul>
{/if}

<style>
    .autocomplete-dropdown {
        position: absolute;
        left: 0;
        right: 0;
        z-index: 50;
        background-color: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        max-height: 200px;
        overflow-y: auto;
        margin: 0;
        padding: 4px 0;
        list-style: none;
    }

    li {
        padding: 8px 12px;
        cursor: pointer;
        font-size: 13px;
        color: var(--text-main);
        transition: background-color 0.15s ease;
    }

    li:hover, li.selected {
        background-color: var(--hover-bg);
        color: var(--primary-color);
    }

    li.loading {
        color: var(--text-muted);
        cursor: default;
    }
    
    li.loading:hover {
        background-color: transparent;
        color: var(--text-muted);
    }
</style>

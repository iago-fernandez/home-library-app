<script lang="ts">
    import { slide } from 'svelte/transition';
    import { ChevronDown, ChevronRight } from 'lucide-svelte';
    import { formSectionStates } from '$lib/stores/preferences';

    export let id: string;
    export let sectionTitle: string;
    export let defaultOpen: boolean = true;
    export let forceOpen: boolean = false;

    // Reactively determine if it should be open
    $: isOpen = forceOpen || ($formSectionStates[id] !== undefined ? $formSectionStates[id] : defaultOpen);

    function toggle() {
        const newState = !isOpen;
        formSectionStates.update(states => ({ ...states, [id]: newState }));
    }
</script>

<div class="form-group collapsible" class:is-open={isOpen}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
        class="collapsible-header"
        on:click={toggle}
        on:keydown={(e) => e.key === 'Enter' && toggle()}
        tabindex="0"
    >
        <div class="header-content">
            {#if isOpen}
                <ChevronDown size={18} />
            {:else}
                <ChevronRight size={18} />
            {/if}
            {sectionTitle}
        </div>
    </div>
    
    {#if isOpen}
        <div class="section-content" transition:slide={{ duration: 200 }}>
            <slot />
        </div>
    {/if}
</div>

<style>
    .form-group.collapsible {
        display: block;
        width: 100%;
        background-color: var(--panel-bg);
        border: 1px solid color-mix(in srgb, var(--border-color) 40%, transparent);
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        overflow: hidden; 
        flex-shrink: 0;
        margin-bottom: 0;
    }

    .collapsible-header {
        width: 100%;
        padding: 16px 20px;
        margin: 0;
        cursor: pointer;
        user-select: none;
        background-color: transparent;
        border: none;
        border-bottom: 1px solid var(--border-color);
        transition: background-color 0.2s ease;
        display: flex;
        align-items: center;
        box-sizing: border-box;
        text-align: left;
    }

    .collapsible-header:hover {
        background-color: color-mix(in srgb, var(--text-main) 3%, transparent);
    }
    
    .collapsible-header:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
        border-radius: 8px 8px 0 0;
    }

    .header-content {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: var(--primary-color);
        width: 100%;
    }

    .section-content {
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
</style>

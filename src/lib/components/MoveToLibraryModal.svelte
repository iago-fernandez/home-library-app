<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { t } from '$lib/i18n';
    import { X, Library as LibraryIcon } from 'lucide-svelte';
    import { libraryStore } from '$lib/stores/library';
    import { apiClient } from '$lib/api/client';
    import { bookStore } from '$lib/stores/book';

    export let isOpen = false;
    export let selectedBookIds: string[] = [];

    const dispatch = createEventDispatcher();
    let targetLibraryId = '';
    let isSubmitting = false;
    let errorMessage = '';

    // Filter out current active library
    $: availableLibraries = $libraryStore.libraries.filter(l => l.id !== $libraryStore.activeLibraryId);

    async function handleMove() {
        if (!targetLibraryId || selectedBookIds.length === 0) return;
        isSubmitting = true;
        errorMessage = '';
        try {
            for (const id of selectedBookIds) {
                await apiClient.patchBook(id, { library_id: targetLibraryId });
            }
            // Once moved, reload books in the current library (they will disappear from current view)
            await bookStore.resetAndLoad();
            bookStore.clearSelection();
            close();
        } catch (e: any) {
            console.error("Move Error:", e);
            errorMessage = $t.modals.moveToLibrary.moveError;
        } finally {
            isSubmitting = false;
        }
    }

    function close() {
        isOpen = false;
        targetLibraryId = '';
        errorMessage = '';
        dispatch('close');
    }
</script>

{#if isOpen}
    <div class="modal-backdrop" on:click|self={close} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && close()}>
        <div class="modal-content">
            <header class="modal-header">
                <h2>{$t.modals.moveToLibrary.title}</h2>
                <button class="close-btn" on:click={close} aria-label={$t.common.close}><X size={20} /></button>
            </header>

            <div class="modal-body">
                <p class="description">
                    {#if selectedBookIds.length === 1}
                        {$t.modals.moveToLibrary.selectDestinationSingular}
                    {:else}
                        {$t.modals.moveToLibrary.selectDestinationPlural(selectedBookIds.length)}
                    {/if}
                </p>
                <div class="library-grid">
                    {#each availableLibraries as lib}
                        <button class="lib-card" class:active={targetLibraryId === lib.id} on:click={() => targetLibraryId = lib.id}>
                            <LibraryIcon size={24} />
                            <span class="lib-name">{lib.name}</span>
                        </button>
                    {/each}
                </div>
                {#if availableLibraries.length === 0}
                    <p class="no-libs">{$t.modals.moveToLibrary.noLibraries}</p>
                {/if}
                {#if errorMessage}
                    <div class="error-banner">
                        {errorMessage}
                    </div>
                {/if}
            </div>

            <footer class="modal-footer">
                <button class="btn-cancel" on:click={close}>{$t.common.cancel}</button>
                <button class="btn-primary" on:click={handleMove} disabled={!targetLibraryId || isSubmitting}>
                    {isSubmitting ? $t.auth.processing : $t.modals.moveToLibrary.moveBtn}
                </button>
            </footer>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
        z-index: 2000;
    }
    .modal-content {
        background: var(--panel-bg, #fff); color: var(--text-main, #333);
        width: 450px; max-width: 95vw; border-radius: 8px;
        display: flex; flex-direction: column; overflow: hidden;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .modal-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 16px 24px; border-bottom: 1px solid var(--border-color, #eee);
    }
    .modal-header h2 {
        margin: 0; font-size: 18px; font-weight: 600; color: var(--text-main);
    }
    .close-btn { 
        background: none; border: none; cursor: pointer; color: var(--text-muted); 
        padding: 4px; border-radius: 6px; transition: background 0.2s;
    }
    .close-btn:hover { background: rgba(0,0,0,0.05); color: var(--text-main); }
    
    .modal-body { 
        padding: 24px;
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow-y: hidden;
    }
    
    .description {
        margin: 0 0 16px 0; font-size: 14px; color: var(--text-main);
        flex-shrink: 0;
    }

    .library-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px; max-height: 100%; overflow-y: auto; overflow-x: hidden; padding: 4px; margin: -4px;
        flex: 1;
    }
    .library-grid::-webkit-scrollbar { width: 8px; }
    .library-grid::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

    @media (max-width: 768px) {
        .modal-body {
            padding: 16px;
        }
        .library-grid {
            grid-template-columns: 1fr;
        }
    }

    .error-banner {
        background-color: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 14px;
        margin-top: 16px;
        border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .lib-card {
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
        padding: 16px 12px; border: 2px solid var(--border-color); border-radius: 8px;
        background: var(--bg-color); color: var(--text-main); cursor: pointer;
        transition: all 0.2s ease-in-out;
    }
    .lib-name {
        font-weight: 500; text-align: center; word-break: break-word; font-size: 14px;
    }
    .lib-card:hover { 
        border-color: var(--primary-color); 
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .lib-card.active {
        border-color: var(--primary-color); 
        background: rgba(var(--primary-color-rgb), 0.08);
        color: var(--primary-color);
        transform: scale(1.02);
    }
    .no-libs { color: var(--text-muted); padding: 16px 0; text-align: center; }

    .modal-footer {
        display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px;
        border-top: 1px solid var(--border-color, #eee); background: var(--bg-color);
    }
    .btn-cancel { 
        background: none; border: 1px solid var(--border-color); padding: 8px 16px; 
        border-radius: 4px; color: var(--text-main); cursor: pointer; font-size: 14px;
        transition: all 0.2s;
    }
    .btn-cancel:hover { background: rgba(0,0,0,0.05); }
    .btn-primary { 
        background: var(--primary-color); color: white; border: none; padding: 8px 16px; 
        border-radius: 4px; cursor: pointer; font-size: 14px; transition: all 0.2s;
    }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

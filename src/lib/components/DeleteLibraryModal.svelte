<script lang="ts">
    import { t } from '$lib/i18n';
    import { createEventDispatcher, onMount } from 'svelte';
    import { AlertTriangle, X } from 'lucide-svelte';

    export let error: string = '';
    
    let password = '';
    let inputRef: HTMLInputElement;
    const dispatch = createEventDispatcher();

    function handleConfirm() {
        dispatch('confirm', password);
    }

    function handleCancel() {
        dispatch('cancel');
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            handleCancel();
        }
    }

    onMount(() => {
        if (inputRef) {
            inputRef.focus();
        }
    });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="modal-backdrop" role="presentation" on:click={handleCancel}>
    <div class="modal-container" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
        <div class="modal-header">
            <div class="icon-wrapper">
                <AlertTriangle size={24} />
            </div>
            <h2>{$t.settings?.dangerZone || 'Danger Zone'}</h2>
            <button class="btn-close" on:click={handleCancel}><X size={20} /></button>
        </div>
        
        <div class="modal-body">
            <p>{$t.libraryManager?.confirmDeleteLibrary || 'Please enter your password to confirm library deletion.'}</p>
            <input 
                type="password" 
                bind:this={inputRef}
                bind:value={password} 
                class="password-input" 
                placeholder="Password..."
                on:keydown={(e) => e.key === 'Enter' && handleConfirm()}
            />
            {#if error}
                <p class="error-text">{error}</p>
            {/if}
        </div>
        
        <div class="modal-footer">
            <button class="btn-cancel" on:click={handleCancel}>
                {$t.common.cancel}
            </button>
            <button class="btn-confirm danger" on:click={handleConfirm}>
                {$t.common.confirm}
            </button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease-out;
    }

    .modal-container {
        background-color: var(--panel-bg, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        width: 100%;
        max-width: 400px;
        overflow: hidden;
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
    }

    .modal-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px 24px 8px 24px;
        text-align: center;
        position: relative;
    }

    .btn-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .btn-close:hover {
        background-color: var(--bg-color);
        color: var(--text-main);
    }

    .icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: #fef2f2;
        color: #ef4444;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 16px;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-main);
    }

    .modal-body {
        padding: 0 24px 24px 24px;
        text-align: center;
    }

    .modal-body p {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: var(--text-muted);
        line-height: 1.5;
    }

    .password-input {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        background-color: var(--bg-color);
        color: var(--text-main);
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
    }

    .password-input:focus {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px var(--focus-ring);
    }

    .error-text {
        color: #ef4444;
        font-size: 12px;
        margin: 8px 0 0 0 !important;
    }

    .modal-footer {
        display: flex;
        gap: 12px;
        padding: 16px 24px;
        background-color: var(--bg-color);
        border-top: 1px solid var(--border-color);
    }

    .modal-footer button {
        flex: 1;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }

    .btn-cancel {
        background-color: transparent;
        color: var(--text-main);
        border: 1px solid var(--border-color);
    }

    .btn-cancel:hover {
        background-color: var(--border-color);
    }

    .btn-confirm {
        background-color: var(--primary-color);
        color: white;
    }

    .btn-confirm.danger {
        background-color: #ef4444;
    }

    .btn-confirm.danger:hover {
        background-color: #dc2626;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }
</style>

<script lang="ts">
    import { dialogStore } from '$lib/stores/dialog';
    import { AlertTriangle, Info } from 'lucide-svelte';
    import { t } from '$lib/i18n';

    function handleConfirm() {
        dialogStore.close(true);
    }

    function handleCancel() {
        dialogStore.close(false);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (!$dialogStore.isOpen) return;
        if (e.key === 'Escape') {
            handleCancel();
        } else if (e.key === 'Enter') {
            handleConfirm();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $dialogStore.isOpen}
    <div class="modal-backdrop" role="presentation" on:click={handleCancel} on:keydown={handleKeydown}>
        <div class="modal-container" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
            <div class="modal-header" class:danger={$dialogStore.isDanger}>
                <div class="icon-wrapper">
                    {#if $dialogStore.isDanger}
                        <AlertTriangle size={24} />
                    {:else}
                        <Info size={24} />
                    {/if}
                </div>
                <h2>{$dialogStore.title}</h2>
            </div>
            
            <div class="modal-body">
                <p>{$dialogStore.message}</p>
            </div>
            
            <div class="modal-footer">
                <button class="btn-cancel" on:click={handleCancel}>
                    {$dialogStore.cancelText || $t.common.cancel || 'Cancel'}
                </button>
                <button class="btn-confirm" class:danger={$dialogStore.isDanger} on:click={handleConfirm}>
                    {$dialogStore.confirmText || $t.common.confirm || 'Confirm'}
                </button>
            </div>
        </div>
    </div>
{/if}

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
        z-index: 9999;
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
    }

    .modal-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px 24px 8px 24px;
        text-align: center;
    }

    .icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: var(--secondary-color, #f0f9ff);
        color: var(--primary-color, #0ea5e9);
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 16px;
    }

    .modal-header.danger .icon-wrapper {
        background-color: #fef2f2;
        color: #ef4444;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-main, #0f172a);
    }

    .modal-body {
        padding: 0 24px 24px 24px;
        text-align: center;
    }

    .modal-body p {
        margin: 0;
        font-size: 14px;
        color: var(--text-muted, #64748b);
        line-height: 1.5;
    }

    .modal-footer {
        display: flex;
        gap: 12px;
        padding: 16px 24px;
        background-color: var(--bg-color, #f8fafc);
        border-top: 1px solid var(--border-color, #e2e8f0);
    }

    button {
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
        color: var(--text-main, #334155);
        border: 1px solid var(--border-color, #cbd5e1);
    }

    .btn-cancel:hover {
        background-color: var(--border-color, #e2e8f0);
    }

    .btn-confirm {
        background-color: var(--primary-color, #0ea5e9);
        color: white;
    }

    .btn-confirm:hover {
        background-color: var(--hover-color, #0284c7);
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

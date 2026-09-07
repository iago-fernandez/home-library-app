<script lang="ts">
    import { t } from '$lib/i18n';
    import { X, Check } from 'lucide-svelte';
    import { createEventDispatcher } from 'svelte';

    export let isOpen = false;
    export let conflicts: Array<{ field: string, label: string, current: any, fetched: any, apply: boolean }> = [];

    const dispatch = createEventDispatcher();

    function close() {
        isOpen = false;
    }

    function applySelected() {
        const selectedUpdates = conflicts.filter(c => c.apply).map(c => ({ field: c.field, value: c.fetched }));
        dispatch('apply', selectedUpdates);
        close();
    }

    function toggleAll(e: Event) {
        const target = e.target as HTMLInputElement;
        conflicts = conflicts.map(c => ({ ...c, apply: target.checked }));
    }

    $: allChecked = conflicts.length > 0 && conflicts.every(c => c.apply);
</script>

{#if isOpen}
    <div class="modal-backdrop" role="presentation" on:click={close} on:keydown={(e) => {if(e.key === 'Escape') close()}}>
        <div class="modal-content" role="dialog" aria-modal="true" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
            <div class="modal-header">
                <h3>{$t.form.autofillConflictsTitle}</h3>
                <button class="btn-close" on:click={close} aria-label="Close">
                    <X size={20} />
                </button>
            </div>
            
            <div class="modal-body">
                <p class="description">{$t.form.autofillConflictsDesc}</p>
                <div class="table-container">
                    <table class="conflict-table">
                        <thead>
                            <tr>
                                <th>
                                    <input type="checkbox" checked={allChecked} on:change={toggleAll} />
                                </th>
                                <th>{$t.form.colField}</th>
                                <th>{$t.form.colCurrent}</th>
                                <th>{$t.form.colFetched}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each conflicts as conflict}
                                <tr>
                                    <td>
                                        <input type="checkbox" bind:checked={conflict.apply} />
                                    </td>
                                    <td class="field-name">{conflict.label}</td>
                                    <td class="old-val">{Array.isArray(conflict.current) ? conflict.current.join(', ') : conflict.current || '(Empty)'}</td>
                                    <td class="new-val">{Array.isArray(conflict.fetched) ? conflict.fetched.join(', ') : conflict.fetched}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn-cancel" on:click={close}>{$t.common.cancel}</button>
                <button class="btn-submit" on:click={applySelected}>
                    <Check size={18} />
                    {$t.form.applySelected}
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
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 20px;
        animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
        background-color: var(--panel-bg);
        border-radius: 8px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        color: var(--text-main);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        overflow: hidden;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        background-color: var(--panel-bg);
    }

    .modal-header h3 {
        margin: 0;
        font-size: 18px;
        color: var(--text-main);
        font-weight: 600;
    }

    .btn-close {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .btn-close:hover {
        background-color: var(--bg-color);
        color: var(--danger-color);
    }

    .modal-body {
        padding: 20px;
        overflow-y: auto;
        background-color: var(--bg-color);
    }

    .description {
        margin: 0 0 16px 0;
        color: var(--text-muted);
        font-size: 14px;
        line-height: 1.5;
    }

    .table-container {
        background: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        overflow: hidden;
    }

    .conflict-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        text-align: left;
    }

    .conflict-table th {
        background: var(--bg-color);
        padding: 12px 16px;
        color: var(--text-muted);
        font-weight: 600;
        border-bottom: 1px solid var(--border-color);
    }

    .conflict-table td {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
        vertical-align: top;
        color: var(--text-main);
    }

    .conflict-table tr:last-child td {
        border-bottom: none;
    }

    .field-name {
        font-weight: 500;
        color: var(--text-main);
    }

    .old-val {
        color: var(--text-muted);
        text-decoration: line-through;
        opacity: 0.8;
    }

    .new-val {
        color: var(--primary-color);
        font-weight: 500;
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 16px 20px;
        border-top: 1px solid var(--border-color);
        gap: 12px;
        background-color: var(--panel-bg);
    }

    .btn-cancel {
        padding: 8px 16px;
        background-color: transparent;
        color: var(--text-main);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
    }

    .btn-cancel:hover {
        background-color: var(--bg-color);
    }

    .btn-submit {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 20px;
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
    }

    .btn-submit:hover {
        filter: brightness(1.1);
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
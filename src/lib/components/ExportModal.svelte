<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { bookStore } from '$lib/store';
    import { activeColumns, availableColumns } from '$lib/stores/preferences';
    import { apiClient } from '$lib/api/client';
    import { X, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-svelte';
    import { t } from '$lib/i18n';

    const dispatch = createEventDispatcher();

    let selectedFormat: 'csv' | 'xml' | 'pdf' = 'csv';
    const selectedIds = bookStore.selectedIds;
    const filterConfig = bookStore.filterConfig;
    const sortConfig = bookStore.sortConfig;
    const orderConfig = bookStore.orderConfig;

    let exportScope: 'view' | 'selected' = $selectedIds.length > 0 ? 'selected' : 'view';

    $: availableColumnsFiltered = availableColumns.filter(c => c.id !== 'cover_url');
    let columnsToExport = $activeColumns.filter(c => c !== 'cover_url');
    let isExporting = false;

    $: previewData = exportScope === 'selected'
        ? $bookStore.filter(b => $selectedIds.includes(b.id)).slice(0, 3)
        : $bookStore.slice(0, 3);

    $: isPdfLimitExceeded = selectedFormat === 'pdf' && columnsToExport.length > 7;

    function moveColumn(index: number, direction: number) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= columnsToExport.length) return;
        const temp = columnsToExport[index];
        columnsToExport[index] = columnsToExport[newIndex];
        columnsToExport[newIndex] = temp;
        columnsToExport = [...columnsToExport];
    }

    function toggleColumn(colId: string) {
        if (columnsToExport.includes(colId)) {
            columnsToExport = columnsToExport.filter(id => id !== colId);
        } else {
            columnsToExport = [...columnsToExport, colId];
        }
    }

    function getColumnLabel(id: string): string {
        return availableColumnsFiltered.find(c => c.id === id)?.label || id;
    }

    function getCellData(book: any, colId: string): string {
        if (!book) return '';
        const val = book[colId];
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return val ? String(val) : '';
    }

    async function executeExport() {
        isExporting = true;
        try {
            const payload = {
                filters: {
                    limit: exportScope === 'selected' ? $selectedIds.length : 100000,
                    offset: 0,
                    sort_by: $sortConfig,
                    sort_order: $orderConfig,
                    query: $filterConfig || undefined
                },
                columns: columnsToExport,
                specific_ids: exportScope === 'selected' && $selectedIds.length > 0 ? $selectedIds : null
            };

            await apiClient.exportData(selectedFormat, payload);
            dispatch('close');
        } catch (error) {
            console.error(error);
        } finally {
            isExporting = false;
        }
    }
</script>

<div class="modal-backdrop" on:click={() => dispatch('close')} role="presentation">
    <div class="modal-content" on:click|stopPropagation role="presentation">
        <div class="modal-header">
            <h2>{$t.exportManager.title}</h2>
            <button class="icon-btn" on:click={() => dispatch('close')}><X size={20} /></button>
        </div>

        <div class="modal-body">
            <div class="config-section">
                <div class="config-group">
                    <h3>{$t.exportManager.format}</h3>
                    <div class="button-group">
                        <button class="toggle-btn" class:active={selectedFormat === 'csv'} on:click={() => selectedFormat = 'csv'}>CSV</button>
                        <button class="toggle-btn" class:active={selectedFormat === 'xml'} on:click={() => selectedFormat = 'xml'}>XML</button>
                        <button class="toggle-btn" class:active={selectedFormat === 'pdf'} on:click={() => selectedFormat = 'pdf'}>PDF</button>
                    </div>

                    {#if selectedFormat === 'pdf'}
                        <div class="pdf-warning" class:critical={isPdfLimitExceeded}>
                            <AlertTriangle size={16} />
                            <p>{$t.exportManager.pdfWarningPrefix} <strong>{columnsToExport.length}</strong> {$t.exportManager.pdfWarningSuffix}</p>
                        </div>
                    {/if}
                </div>

                <div class="config-group">
                    <h3>{$t.exportManager.scope}</h3>
                    <div class="button-group">
                        <button class="toggle-btn" class:active={exportScope === 'view'} on:click={() => exportScope = 'view'}>{$t.exportManager.currentView}</button>
                        <button class="toggle-btn" class:active={exportScope === 'selected'} disabled={$selectedIds.length === 0} on:click={() => exportScope = 'selected'}>
                            {$t.exportManager.selectedScope} ({$selectedIds.length})
                        </button>
                    </div>
                </div>
            </div>

            <div class="columns-section">
                <h3>{$t.exportManager.activeColumns}</h3>
                <div class="columns-list">
                    {#each columnsToExport as colId, index}
                        <div class="column-item">
                            <span class="drag-handle">{getColumnLabel(colId)}</span>
                            <div class="column-actions">
                                <button class="icon-btn-small" disabled={index === 0} on:click={() => moveColumn(index, -1)}><ArrowUp size={14} /></button>
                                <button class="icon-btn-small" disabled={index === columnsToExport.length - 1} on:click={() => moveColumn(index, 1)}><ArrowDown size={14} /></button>
                                <button class="icon-btn-small remove" on:click={() => toggleColumn(colId)}><X size={14} /></button>
                            </div>
                        </div>
                    {/each}
                </div>

                <h3>{$t.exportManager.availableColumns}</h3>
                <div class="available-columns">
                    {#each availableColumnsFiltered.filter(c => !columnsToExport.includes(c.id)) as col}
                        <button class="chip-btn" on:click={() => toggleColumn(col.id)}>+ {col.label}</button>
                    {/each}
                </div>
            </div>

            <div class="preview-section">
                <h3>{$t.exportManager.dataMatrixPreview}</h3>
                <div class="table-container">
                    <table>
                        <thead>
                        <tr>
                            {#each columnsToExport as colId}
                                <th>{getColumnLabel(colId)}</th>
                            {/each}
                        </tr>
                        </thead>
                        <tbody>
                        {#each previewData as row}
                            <tr>
                                {#each columnsToExport as colId}
                                    <td>{getCellData(row, colId)}</td>
                                {/each}
                            </tr>
                        {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn-secondary" on:click={() => dispatch('close')}>{$t.common.cancel}</button>
            <button class="btn-primary" on:click={executeExport} disabled={isExporting || columnsToExport.length === 0}>
                {isExporting ? $t.exportManager.exportingState : $t.exportManager.exportAction}
            </button>
        </div>
    </div>
</div>

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-content {
        background: #ffffff;
        width: 900px;
        max-width: 95vw;
        height: 80vh;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 18px;
        color: #1a1a1a;
    }

    .icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
        display: flex;
        padding: 4px;
        border-radius: 4px;
    }

    .icon-btn:hover {
        background: #f5f5f5;
        color: #1a1a1a;
    }

    .modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: grid;
        grid-template-columns: 300px 1fr;
        gap: 24px;
    }

    .config-section {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .config-group h3, .columns-section h3, .preview-section h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #444;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .button-group {
        display: flex;
        gap: 8px;
    }

    .toggle-btn {
        flex: 1;
        padding: 8px;
        border: 1px solid #d9d9d9;
        background: #f9f9f9;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
    }

    .toggle-btn.active {
        background: #0066cc;
        color: white;
        border-color: #0066cc;
    }

    .toggle-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .pdf-warning {
        background-color: #fff8e1;
        border-left: 4px solid #ffc107;
        padding: 12px;
        margin-top: 16px;
        font-size: 12px;
        color: #663c00;
        display: flex;
        gap: 8px;
        align-items: flex-start;
        border-radius: 0 4px 4px 0;
    }

    .pdf-warning p {
        margin: 0;
        line-height: 1.4;
    }

    .pdf-warning.critical {
        background-color: #ffebee;
        border-left-color: #f44336;
        color: #b71c1c;
    }

    .columns-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 24px;
    }

    .column-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        font-size: 13px;
    }

    .column-actions {
        display: flex;
        gap: 4px;
    }

    .icon-btn-small {
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
        padding: 2px;
        border-radius: 2px;
    }

    .icon-btn-small:hover:not(:disabled) {
        background: #e0e0e0;
        color: #1a1a1a;
    }

    .icon-btn-small.remove:hover {
        color: #d32f2f;
    }

    .icon-btn-small:disabled {
        opacity: 0.3;
        cursor: default;
    }

    .available-columns {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .chip-btn {
        background: #ffffff;
        border: 1px dashed #ccc;
        padding: 4px 10px;
        border-radius: 16px;
        font-size: 12px;
        cursor: pointer;
        color: #555;
    }

    .chip-btn:hover {
        background: #f0f8ff;
        border-color: #0066cc;
        color: #0066cc;
    }

    .preview-section {
        grid-column: 1 / -1;
        margin-top: 12px;
        border-top: 1px solid #e0e0e0;
        padding-top: 24px;
    }

    .table-container {
        overflow-x: auto;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        text-align: left;
    }

    th, td {
        padding: 8px 12px;
        border-bottom: 1px solid #f0f0f0;
        white-space: nowrap;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    th {
        background: #f9f9f9;
        font-weight: 600;
        color: #333;
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid #e0e0e0;
        background: #fafafa;
    }

    .btn-secondary {
        padding: 8px 16px;
        border: 1px solid #ccc;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }

    .btn-secondary:hover {
        background: #f9f9f9;
        border-color: #999;
    }

    .btn-primary {
        padding: 8px 16px;
        border: none;
        background: #0066cc;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }

    .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>
<script lang="ts">
    import { t } from '$lib/i18n';
    import { activeColumns, availableColumns } from '$lib/stores/preferences';
    import { X, GripVertical } from 'lucide-svelte';

    export let onClose: () => void;

    let localColumns = [...availableColumns];

    $: isColumnActive = (colId: string) => $activeColumns.includes(colId);

    function toggleColumn(colId: string) {
        if ($activeColumns.includes(colId)) {
            if ($activeColumns.length > 1) {
                activeColumns.set($activeColumns.filter(id => id !== colId));
            }
        } else {
            const newActive = localColumns
                .map(c => c.id)
                .filter(id => $activeColumns.includes(id) || id === colId);
            activeColumns.set(newActive);
        }
    }

    function handleReset() {
        activeColumns.reset();
    }

    let draggedIndex: number | null = null;

    function handleDragStart(e: DragEvent, index: number) {
        draggedIndex = index;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
        }
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
        }
    }

    function handleDrop(e: DragEvent, targetIndex: number) {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const newCols = [...localColumns];
        const [removed] = newCols.splice(draggedIndex, 1);
        newCols.splice(targetIndex, 0, removed);
        localColumns = newCols;

        const currentActiveIds = new Set($activeColumns);
        const newActiveOrder = localColumns
            .map(c => c.id)
            .filter(id => currentActiveIds.has(id));

        activeColumns.set(newActiveOrder);
        draggedIndex = null;
    }
</script>

<div class="modal-backdrop" on:click={onClose} role="button" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && onClose()}>
    <div class="modal-content" on:click|stopPropagation role="presentation">
        <div class="modal-header">
            <h3>{$t.grid.manageColumns || 'Manage Columns'}</h3>
            <button class="icon-btn" on:click={onClose}><X size={20} /></button>
        </div>

        <div class="modal-body">
            <p class="help-text">{$t.grid.columnsHelp || 'Drag to reorder. Check to show or hide.'}</p>

            <ul class="column-list">
                {#each localColumns as col, index (col.id)}
                    <li
                            class="column-item"
                            draggable="true"
                            on:dragstart={(e) => handleDragStart(e, index)}
                            on:dragover={handleDragOver}
                            on:drop={(e) => handleDrop(e, index)}
                            class:dragging={draggedIndex === index}
                    >
                        <div class="drag-handle" title="Drag to reorder">
                            <GripVertical size={16} color="#999" />
                        </div>
                        <label class="checkbox-label">
                            <input
                                    type="checkbox"
                                    checked={isColumnActive(col.id)}
                                    on:change={() => toggleColumn(col.id)}
                                    disabled={$activeColumns.length === 1 && isColumnActive(col.id)}
                            />
                            <span>{col.label}</span>
                        </label>
                    </li>
                {/each}
            </ul>
        </div>

        <div class="modal-footer">
            <button class="btn-secondary" on:click={handleReset}>{$t.common.reset || 'Reset to Default'}</button>
            <button class="btn-primary" on:click={onClose}>{$t.common.close || 'Done'}</button>
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
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background-color: #ffffff;
        border-radius: 8px;
        width: 400px;
        max-width: 90vw;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 16px;
        color: #333;
    }

    .icon-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        color: #666;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .icon-btn:hover {
        background-color: #f0f0f0;
        color: #333;
    }

    .modal-body {
        padding: 16px 20px;
        overflow-y: auto;
        flex: 1;
    }

    .help-text {
        font-size: 13px;
        color: #666;
        margin-top: 0;
        margin-bottom: 16px;
    }

    .column-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .column-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background-color: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        gap: 12px;
        transition: background-color 0.2s, box-shadow 0.2s;
    }

    .column-item:hover {
        background-color: #f0f0f0;
    }

    .column-item.dragging {
        opacity: 0.5;
        background-color: #e3f2fd;
        border-style: dashed;
        border-color: #0066cc;
    }

    .drag-handle {
        cursor: grab;
        display: flex;
        align-items: center;
    }

    .drag-handle:active {
        cursor: grabbing;
    }

    .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        flex: 1;
        font-size: 14px;
        color: #333;
        user-select: none;
    }

    .checkbox-label input {
        cursor: pointer;
    }

    .checkbox-label input:disabled + span {
        color: #999;
    }

    .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        background-color: #fafafa;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
    }

    button {
        padding: 8px 16px;
        font-size: 13px;
        cursor: pointer;
        border-radius: 4px;
        font-weight: 500;
        transition: background-color 0.2s;
    }

    .btn-secondary {
        background-color: transparent;
        border: 1px solid #ccc;
        color: #555;
    }

    .btn-secondary:hover {
        background-color: #f0f0f0;
    }

    .btn-primary {
        background-color: #0066cc;
        color: white;
        border: 1px solid #005bb5;
    }

    .btn-primary:hover {
        background-color: #005bb5;
    }
</style>
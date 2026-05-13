<script lang="ts">
    import { t } from '$lib/i18n';
    import { activeColumns, availableColumns } from '$lib/stores/preferences';
    import { GripVertical, RotateCcw } from 'lucide-svelte';

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

<div class="workspace-panel">
    <div class="panel-header">
        <div>
            <h3 class="panel-title">{$t.grid.manageColumns}</h3>
            <p class="help-text">{$t.grid.columnsHelp}</p>
        </div>
        <button class="reset-btn" on:click={handleReset} title={$t.common.reset}>
            <RotateCcw size={16} />
        </button>
    </div>

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
                <div class="drag-handle" title={$t.grid.dragToReorder}>
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

<style>
    .workspace-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
    }

    .panel-title {
        margin: 0 0 4px 0;
        font-size: 15px;
        color: #333;
        font-weight: 600;
    }

    .help-text {
        font-size: 13px;
        color: #666;
        margin: 0;
    }

    .reset-btn {
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 6px;
        color: #555;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .reset-btn:hover {
        background: #e6f7ff;
        border-color: #0066cc;
        color: #0066cc;
    }

    .column-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        padding-right: 4px;
    }

    .column-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background-color: #f9f9f9;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
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
        margin: 0;
    }

    .checkbox-label input:disabled + span {
        color: #999;
    }
</style>
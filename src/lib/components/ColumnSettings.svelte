<script lang="ts">
    import { t } from '$lib/i18n';
    import { activeColumns, availableColumns, activeMosaicAttributes } from '$lib/stores/preferences';
    import { GripVertical, RotateCcw, Table, LayoutGrid } from 'lucide-svelte';

    export let activeTab: 'table' | 'mosaic' = 'table';

    function initLocalList(activeIds: string[], forceTop: string[] = []) {
        const activeCols = activeIds.map(id => availableColumns.find(c => c.id === id)).filter(Boolean) as any[];
        const inactiveCols = availableColumns.filter(c => !activeIds.includes(c.id));
        let list = [...activeCols, ...inactiveCols];
        
        if (forceTop.length > 0) {
            const fixedItems = list.filter(c => forceTop.includes(c.id));
            fixedItems.sort((a, b) => forceTop.indexOf(a.id) - forceTop.indexOf(b.id));
            const otherItems = list.filter(c => !forceTop.includes(c.id));
            list = [...fixedItems, ...otherItems];
        }
        return list;
    }

    let localColumns = initLocalList($activeColumns);
    let localAttributes = initLocalList($activeMosaicAttributes, ['title', 'authors']);

    $: isColumnActive = (colId: string) => $activeColumns.includes(colId);
    $: isAttributeActive = (attrId: string) => $activeMosaicAttributes.includes(attrId);

    function toggleItem(id: string) {
        if (activeTab === 'table') {
            if ($activeColumns.includes(id)) {
                if ($activeColumns.length > 1) {
                    activeColumns.set($activeColumns.filter(cId => cId !== id));
                }
            } else {
                const newActive = localColumns.map(c => c.id).filter(cId => $activeColumns.includes(cId) || cId === id);
                activeColumns.set(newActive);
            }
        } else {
            if ($activeMosaicAttributes.includes(id)) {
                if ($activeMosaicAttributes.length > 1) {
                    activeMosaicAttributes.set($activeMosaicAttributes.filter(aId => aId !== id));
                }
            } else {
                const newActive = localAttributes.map(c => c.id).filter(aId => $activeMosaicAttributes.includes(aId) || aId === id);
                activeMosaicAttributes.set(newActive);
            }
        }
    }

    function handleReset() {
        if (activeTab === 'table') {
            activeColumns.reset();
        } else {
            activeMosaicAttributes.reset();
        }
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

        const currentList = activeTab === 'table' ? localColumns : localAttributes;
        if (activeTab === 'mosaic' && (currentList[targetIndex].id === 'title' || currentList[targetIndex].id === 'authors')) return;

        if (activeTab === 'table') {
            const newCols = [...localColumns];
            const [removed] = newCols.splice(draggedIndex, 1);
            newCols.splice(targetIndex, 0, removed);
            localColumns = newCols;

            const currentActiveIds = new Set($activeColumns);
            activeColumns.set(localColumns.map(c => c.id).filter(id => currentActiveIds.has(id)));
        } else {
            const newAttrs = [...localAttributes];
            const [removed] = newAttrs.splice(draggedIndex, 1);
            newAttrs.splice(targetIndex, 0, removed);
            localAttributes = newAttrs;

            const currentActiveIds = new Set($activeMosaicAttributes);
            activeMosaicAttributes.set(localAttributes.map(c => c.id).filter(id => currentActiveIds.has(id)));
        }
        draggedIndex = null;
    }
</script>

<div class="workspace-panel">
    <div class="panel-header">
        <div class="view-tabs">
            <button class:active={activeTab === 'table'} on:click={() => activeTab = 'table'}>
                <Table size={16} /> {$t.grid.columns}
            </button>
            <button class:active={activeTab === 'mosaic'} on:click={() => activeTab = 'mosaic'}>
                <LayoutGrid size={16} /> {$t.grid.attributes}
            </button>
        </div>
        <button class="reset-btn" on:click={handleReset} title={$t.common.reset}>
            <RotateCcw size={16} />
        </button>
    </div>

    <div class="panel-info">
        <h3 class="panel-title">{activeTab === 'table' ? $t.grid.manageColumns : $t.grid.manageAttributes}</h3>
        <p class="help-text">{activeTab === 'table' ? $t.grid.columnsDesc : $t.grid.attributesDesc}</p>
    </div>

    <ul class="column-list">
        {#each (activeTab === 'table' ? localColumns : localAttributes) as item, index (item.id)}
            <li
                    class="column-item"
                    draggable={!(activeTab === 'mosaic' && (item.id === 'title' || item.id === 'authors'))}
                    on:dragstart={(e) => { if(!(activeTab === 'mosaic' && (item.id === 'title' || item.id === 'authors'))) handleDragStart(e, index); }}
                    on:dragover={handleDragOver}
                    on:drop={(e) => handleDrop(e, index)}
                    class:dragging={draggedIndex === index}
                    class:fixed-item={activeTab === 'mosaic' && (item.id === 'title' || item.id === 'authors')}
            >
                <div class="drag-handle" title={$t.grid.dragToReorder} style="opacity: {activeTab === 'mosaic' && (item.id === 'title' || item.id === 'authors') ? '0' : '1'}">
                    <GripVertical size={16} color="#999" />
                </div>
                <label class="checkbox-label">
                    <input
                            type="checkbox"
                            checked={(item.id === 'title' || item.id === 'authors') || (activeTab === 'table' ? isColumnActive(item.id) : isAttributeActive(item.id))}
                            on:change={() => toggleItem(item.id)}
                            disabled={(item.id === 'title' || item.id === 'authors') || (activeTab === 'table' ? $activeColumns.length === 1 && isColumnActive(item.id) : $activeMosaicAttributes.length === 1 && isAttributeActive(item.id))}
                    />
                    <span>{($t.grid as Record<string, string>)['col_' + item.id] || item.label}</span>
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
        padding: 8px 16px 8px 24px;
        background-color: transparent;
    }

    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    }

    .view-tabs {
        display: flex;
        gap: 8px;
    }

    .view-tabs button {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--button-bg);
        border: 1px solid var(--button-border);
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        color: var(--text-muted);
    }

    .view-tabs button.active {
        background: var(--secondary-color);
        border-color: var(--primary-color);
        color: var(--primary-color);
        font-weight: 500;
    }

    @media (max-width: 768px) {
        .workspace-panel {
            padding: 0;
            position: relative;
        }
        .column-list {
            padding-right: 0 !important;
        }
        
        .panel-header {
            flex-direction: row;
            align-items: center;
            gap: 12px;
            padding-bottom: 12px;
        }

        .reset-btn {
            flex-shrink: 0;
            align-self: center;
        }

        .view-tabs {
            background-color: var(--button-bg, #f1f5f9) !important;
            padding: 4px !important;
            border-radius: 8px !important;
            gap: 4px !important;
            flex: 1;
        }

        .view-tabs button {
            background: transparent !important;
            border: none !important;
            flex: 1;
            justify-content: center;
            transition: all 0.2s ease;
            box-shadow: none !important;
        }

        .view-tabs button.active {
            background: var(--panel-bg, #ffffff) !important;
            color: var(--primary-color) !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
            border: none !important;
        }
    }

    .panel-info {
        margin-bottom: 16px;
    }

    .panel-title {
        margin: 0 0 4px 0;
        font-size: 15px;
        color: var(--text-main);
        font-weight: 600;
    }

    .help-text {
        font-size: 13px;
        color: var(--text-muted);
        margin: 0;
    }

    .reset-btn {
        background: var(--button-bg);
        border: 1px solid var(--button-border);
        border-radius: 6px;
        padding: 6px;
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .reset-btn:hover {
        background: var(--secondary-color);
        border-color: var(--primary-color);
        color: var(--primary-color);
    }

    .column-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        padding-right: 8px;
        flex: 1;
        overflow-x: hidden;
        overscroll-behavior: contain;
        transform: translateZ(0); /* Force GPU acceleration for smooth scroll */
    }

    .column-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background-color: #ffffff;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        gap: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
    }

    .column-item:hover {
        background-color: var(--bg-color);
    }

    .column-item.dragging {
        opacity: 0.5;
        background-color: var(--hover-color);
    }
    .column-item.fixed-item {
        background-color: var(--bg-color);
        border-color: var(--border-color);
        cursor: default;
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
        gap: 12px;
        cursor: pointer;
        flex: 1;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-main);
        user-select: none;
    }

    .checkbox-label input {
        cursor: pointer;
        margin: 0;
    }

    .checkbox-label input:disabled + span {
        color: var(--text-muted);
        opacity: 0.5;
    }
</style>
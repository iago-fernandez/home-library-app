<script lang="ts">
  import { onMount } from 'svelte';
  import { bookStore } from '$lib/store';
  import { apiClient } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import DataGrid from '$lib/components/DataGrid.svelte';
  import MosaicGrid from '$lib/components/MosaicGrid.svelte';
  import BookForm from '$lib/components/BookForm.svelte';
  import ExportModal from '$lib/components/ExportModal.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import BatchEditPanel from '$lib/components/BatchEditPanel.svelte';
  import type { CreateBookPayload } from '$lib/types/book';
  import { Plus, Pencil, Trash2, Filter, Settings, X, Search, CheckSquare, Download } from 'lucide-svelte';

  let activePanel: 'actions' | 'addBook' | 'editBook' | 'filter' | 'batchEdit' = 'actions';
  let showExportModal = false;
  let showSettingsModal = false;
  let currentView: 'table' | 'mosaic' = 'table';
  let isSubmitting = false;

  type FieldType = 'text' | 'numeric';
  type InputHTMLType = 'text' | 'number' | 'date';

  interface FilterRule {
    id: string;
    field: string;
    type: FieldType;
    inputType: InputHTMLType;
    operator: string;
    value: string;
    isNot: boolean;
    caseSensitive: boolean;
  }

  let activeFilters: FilterRule[] = [];
  let filterTimer: ReturnType<typeof setTimeout>;
  let lastAppliedFilters: string | undefined = undefined;
  let matchType: 'AND' | 'OR' = 'AND';

  let openMenu: string | null = null;

  const localSearchActive = bookStore.localSearchActive;
  const selectedIds = bookStore.selectedIds;
  const selectedId = bookStore.selectedId;
  const multiSelectMode = bookStore.multiSelectMode;

  $: availableFields = [
    { value: 'title', label: $t.grid.title, type: 'text' as FieldType, inputType: 'text' as InputHTMLType },
    { value: 'author', label: $t.grid.authors, type: 'text' as FieldType, inputType: 'text' as InputHTMLType },
    { value: 'publisher', label: $t.grid.publisher, type: 'text' as FieldType, inputType: 'text' as InputHTMLType },
    { value: 'publish_date', label: $t.grid.date, type: 'numeric' as FieldType, inputType: 'date' as InputHTMLType },
    { value: 'isbn_13', label: $t.grid.isbn, type: 'text' as FieldType, inputType: 'text' as InputHTMLType },
    { value: 'location_room', label: $t.grid.room, type: 'text' as FieldType, inputType: 'text' as InputHTMLType },
    { value: 'location_bookcase', label: $t.grid.bookcase, type: 'text' as FieldType, inputType: 'text' as InputHTMLType }
  ];

  $: operatorDefinitions = {
    text: [
      { value: '_contains', label: $t.filters.contains },
      { value: '_exact', label: $t.filters.exact },
      { value: '_starts', label: $t.filters.starts },
      { value: '_ends', label: $t.filters.ends }
    ],
    numeric: [
      { value: '_exact', label: $t.filters.exact },
      { value: '_gt', label: $t.filters.greater },
      { value: '_gte', label: $t.filters.greaterEqual },
      { value: '_lt', label: $t.filters.less },
      { value: '_lte', label: $t.filters.lessEqual }
    ]
  };

  $: selectedBook = $bookStore.find(b => b.id === $selectedId);

  onMount(() => {
    bookStore.loadBooks();
  });

  function toggleMenu(menuName: string) {
    openMenu = openMenu === menuName ? null : menuName;
  }

  function closeMenus() {
    openMenu = null;
  }

  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.menu-container')) {
      closeMenus();
    }
  }

  function handleAddBookClick() {
    activePanel = 'addBook';
  }

  function handleEditBookClick() {
    if ($selectedIds.length === 1) {
      activePanel = 'editBook';
    } else if ($selectedIds.length > 1) {
      activePanel = 'batchEdit';
    }
  }

  function handleFilterClick() {
    activePanel = 'filter';
    if (activeFilters.length === 0) {
      addFilterRule();
    }
  }

  async function handleBatchDeleteClick() {
    if ($selectedIds.length > 0 && confirm(`${$selectedIds.length} ${$t.actions.confirmBatchDelete}`)) {
      try {
        await bookStore.deleteBooksBatch($selectedIds);
      } catch (error) {
        console.error(error);
      }
    }
  }

  function handleFormCancel() {
    activePanel = 'actions';
  }

  async function handleFormSubmit(payload: CreateBookPayload, imageFile?: File) {
    if (isSubmitting) return;
    isSubmitting = true;

    try {
      if (imageFile) {
        const uploadResponse = await apiClient.uploadCover(imageFile);
        payload.cover_url = uploadResponse.url;
      } else if (payload.cover_url && payload.cover_url.startsWith('http') && !payload.cover_url.includes(window.location.hostname)) {
        try {
          const response = await fetch(payload.cover_url);
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], "fetched-cover.jpg", { type: blob.type });
            const uploadResponse = await apiClient.uploadCover(file);
            payload.cover_url = uploadResponse.url;
          }
        } catch (error) {
          console.warn("External image download failed, keeping original URL", error);
        }
      }

      if (activePanel === 'editBook' && $selectedId) {
        await bookStore.updateBook($selectedId, payload);
      } else {
        await bookStore.addBook(payload);
      }
      activePanel = 'actions';
    } catch (error) {
      console.error(error);
    } finally {
      isSubmitting = false;
    }
  }

  function addFilterRule() {
    activeFilters = [...activeFilters, {
      id: crypto.randomUUID(),
      field: 'title',
      type: 'text',
      inputType: 'text',
      operator: '_contains',
      value: '',
      isNot: false,
      caseSensitive: false
    }];
  }

  function removeFilterRule(id: string) {
    activeFilters = activeFilters.filter(rule => rule.id !== id);
    triggerDebouncedFilter();
  }

  function handleFieldChange(rule: FilterRule) {
    const fieldDef = availableFields.find(f => f.value === rule.field);
    if (fieldDef) {
      const oldInputType = rule.inputType;

      rule.type = fieldDef.type;
      rule.inputType = fieldDef.inputType;
      rule.operator = operatorDefinitions[fieldDef.type as FieldType][0].value;

      if (oldInputType !== fieldDef.inputType) {
        rule.value = '';
      }
    }
    activeFilters = [...activeFilters];
    triggerDebouncedFilter();
  }

  function handleControlChange() {
    activeFilters = [...activeFilters];
    triggerDebouncedFilter();
  }

  function triggerDebouncedFilter() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(async () => {
      const validRules = activeFilters.filter(rule => rule.value.trim() !== '');

      if (validRules.length === 0) {
        if (lastAppliedFilters !== undefined) {
          lastAppliedFilters = undefined;
          await bookStore.applyFilters(undefined);
        }
        return;
      }

      const astNodes = validRules.map(rule => {
        let finalOperator = rule.operator;
        if (rule.caseSensitive && ['_contains', '_starts', '_ends'].includes(finalOperator)) {
          finalOperator += '_case';
        }

        const conditionNode = {
          type: "CONDITION",
          field: rule.field,
          operator: finalOperator,
          value: rule.value.trim()
        };

        if (rule.isNot) {
          return {
            type: "NOT",
            node: conditionNode
          };
        }

        return conditionNode;
      });

      let finalAst;
      if (astNodes.length === 1) {
        finalAst = astNodes[0];
      } else {
        finalAst = {
          type: matchType,
          nodes: astNodes
        };
      }

      const queryJson = JSON.stringify(finalAst);

      if (queryJson !== lastAppliedFilters) {
        lastAppliedFilters = queryJson;
        await bookStore.applyFilters(queryJson);
      }
    }, 400);
  }

  async function clearFilters() {
    activeFilters = [];
    lastAppliedFilters = undefined;
    await bookStore.applyFilters(undefined);
    if (activePanel === 'filter') {
      addFilterRule();
    }
  }

  function formatRuleForDisplay(rule: FilterRule): string {
    const fieldDef = availableFields.find(f => f.value === rule.field);
    const fieldLabel = fieldDef ? fieldDef.label : rule.field;

    let opLabel = rule.operator;
    for (const key in operatorDefinitions) {
      const found = operatorDefinitions[key as FieldType].find(o => o.value === rule.operator.replace('_case', ''));
      if (found) {
        opLabel = found.label.toLowerCase();
        break;
      }
    }

    let text = `${fieldLabel} ${rule.isNot ? 'NOT ' : ''}${opLabel} "${rule.value}"`;
    if (rule.caseSensitive) text += ' (Aa)';
    return text;
  }
  function handleGlobalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (openMenu) { closeMenus(); return; }
      if (showExportModal || showSettingsModal) { showExportModal = false; showSettingsModal = false; return; }
      if (activePanel !== 'actions') { handleFormCancel(); return; }
      if ($selectedIds.length > 0) { bookStore.clearSelection(); return; }
      if ($multiSelectMode) { bookStore.toggleMultiSelectMode(); return; }
    }

    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'f') {
      e.preventDefault();
      bookStore.toggleLocalSearch();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      handleFilterClick();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === ',')) {
      e.preventDefault();
      showSettingsModal = true;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      showExportModal = true;
    }
    if (e.altKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      handleAddBookClick();
    }
    if (e.key === 'F5') {
      e.preventDefault();
      bookStore.loadBooks();
    }
  }
</script>

<svelte:window on:click={handleWindowClick} on:keydown={handleGlobalKeydown} />

<div class="app-container">
  <header class="top-bar" data-tauri-drag-region>
    <nav class="menu-bar">
      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'File'} on:click={() => toggleMenu('File')}>{$t.menu.file}</button>
        {#if openMenu === 'File'}
          <div class="dropdown-menu">
            <button class="dropdown-item">{$t.menu.newLibrary}</button>
            <button class="dropdown-item" on:click={() => { showSettingsModal = true; closeMenus(); }}>
              {$t.menu.settings}
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" on:click={() => { apiClient.logout(); closeMenus(); }}>
              {$t.menu.exit}
            </button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'Edit'} on:click={() => toggleMenu('Edit')}>{$t.menu.edit}</button>
        {#if openMenu === 'Edit'}
          <div class="dropdown-menu">
            <button class="dropdown-item" on:click={() => { bookStore.toggleMultiSelectMode(); closeMenus(); }}>
              {$multiSelectMode ? $t.menu.exitMultiSelect : $t.menu.enterMultiSelect}
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" on:click={() => { bookStore.toggleLocalSearch(); closeMenus(); }}>{$t.menu.findInView}</button>
            <button class="dropdown-item" on:click={() => { handleFilterClick(); closeMenus(); }}>{$t.menu.advancedFilter}</button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'View'} on:click={() => toggleMenu('View')}>{$t.menu.view}</button>
        {#if openMenu === 'View'}
          <div class="dropdown-menu">
            <button class="dropdown-item" on:click={() => { bookStore.loadBooks(); closeMenus(); }}>{$t.common.refresh} (F5)</button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'Tools'} on:click={() => toggleMenu('Tools')}>{$t.menu.tools}</button>
        {#if openMenu === 'Tools'}
          <div class="dropdown-menu">
            <button class="dropdown-item">{$t.menu.importIsbn}</button>
            <button class="dropdown-item" on:click={() => { showExportModal = true; closeMenus(); }}>{$t.menu.exportCsv}</button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'Help'} on:click={() => toggleMenu('Help')}>{$t.menu.help}</button>
        {#if openMenu === 'Help'}
          <div class="dropdown-menu">
            <button class="dropdown-item">{$t.menu.documentation}</button>
            <button class="dropdown-item">{$t.menu.about}</button>
          </div>
        {/if}
      </div>
    </nav>
  </header>

  <main class="workspace">
    <section class="center-stage">
      {#if activeFilters.filter(r => r.value.trim() !== '').length > 0}
        <div class="active-filters-bar">
          <span class="active-filters-label">{$t.filters.activeFilters} {matchType === 'OR' ? '(Any)' : '(All)'}:</span>
          <div class="filter-chips">
            {#each activeFilters.filter(r => r.value.trim() !== '') as rule (rule.id)}
              <div class="filter-chip">
                <button class="chip-text-btn" on:click={handleFilterClick}>{formatRuleForDisplay(rule)}</button>
                <button class="chip-remove" on:click={() => removeFilterRule(rule.id)}>
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            {/each}
          </div>
          <button class="btn-clear-chips" on:click={clearFilters}>{$t.filters.clearAll}</button>
        </div>
      {/if}
      <div class="grid-wrapper">
        {#if $multiSelectMode}
          <div class="multi-select-banner">
            {$t.actions.multiSelectActive}
            <button class="btn-exit-mode" on:click={bookStore.toggleMultiSelectMode}>{$t.actions.exit}</button>
          </div>
        {/if}

        <div class="view-selector">
          <button class:active={currentView === 'table'} on:click={() => currentView = 'table'}>Tabla</button>
          <button class:active={currentView === 'mosaic'} on:click={() => currentView = 'mosaic'}>Mosaico</button>
        </div>

        <div class="view-container">
          {#if currentView === 'table'}
            <DataGrid />
          {:else if currentView === 'mosaic'}
            <MosaicGrid />
          {/if}
        </div>
      </div>
    </section>

    <aside class="side-panel" class:wide-panel={activePanel === 'addBook' || activePanel === 'editBook' || activePanel === 'filter' || activePanel === 'batchEdit'} class:toolbar-mode={activePanel === 'actions'}>
      {#if activePanel === 'actions'}
        <div class="toolbar">
          {#if $selectedIds.length > 0}
            <div class="batch-actions-container">
              <span class="batch-count">{$selectedIds.length}</span>
              <span class="batch-label">{$t.common.selected}</span>

              <div class="toolbar-divider"></div>

              <button class="icon-btn" title={$t.actions.editSelected} on:click={handleEditBookClick}>
                <Pencil size={20} strokeWidth={1.5} />
              </button>

              <button class="icon-btn" title={$t.actions.exportSelected} on:click={() => showExportModal = true}>
                <Download size={20} strokeWidth={1.5} />
              </button>

              <button class="icon-btn danger" title={$t.actions.deleteSelected} on:click={handleBatchDeleteClick}>
                <Trash2 size={20} strokeWidth={1.5} />
              </button>

              <div class="toolbar-divider"></div>

              <button class="icon-btn" title={$t.actions.clearSelection} on:click={bookStore.clearSelection}>
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
          {:else}
            <button class="icon-btn primary" title={$t.actions.addBook} on:click={handleAddBookClick}>
              <Plus size={20} strokeWidth={1.5} />
            </button>

            <div class="toolbar-divider"></div>

            <button class="icon-btn" title="Export" on:click={() => showExportModal = true}>
              <Download size={20} strokeWidth={1.5} />
            </button>

            <button class="icon-btn" title={$t.actions.toggleMultiSelect} class:active={$multiSelectMode} on:click={bookStore.toggleMultiSelectMode}>
              <CheckSquare size={20} strokeWidth={1.5} />
            </button>
            <button class="icon-btn" title={$t.menu.findInView} class:active={$localSearchActive} on:click={bookStore.toggleLocalSearch}>
              <Search size={20} strokeWidth={1.5} />
            </button>
            <button class="icon-btn" title={$t.menu.advancedFilter} class:active={activeFilters.filter(r => r.value.trim() !== '').length > 0} on:click={handleFilterClick}>
              <Filter size={20} strokeWidth={1.5} />
            </button>
            <button class="icon-btn" title={$t.actions.systemSettings} on:click={() => showSettingsModal = true}>
              <Settings size={20} strokeWidth={1.5} />
            </button>
          {/if}
        </div>
      {:else if activePanel === 'addBook' || activePanel === 'editBook'}
        <div class="panel-content">
          <BookForm initialData={activePanel === 'editBook' ? selectedBook : null} onCancel={handleFormCancel} onSubmit={handleFormSubmit} />
        </div>
      {:else if activePanel === 'batchEdit'}
        <div class="panel-content">
          <BatchEditPanel onCancel={handleFormCancel} />
        </div>
      {:else if activePanel === 'filter'}
        <div class="panel-content filter-panel">
          <div class="panel-header">
            <h3>{$t.filters.advancedFilters}</h3>
            <div class="header-actions">
              <button class="btn-clear" on:click={clearFilters}>{$t.common.clear}</button>
              <button class="icon-btn close-btn" on:click={handleFormCancel}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div class="filter-rules-container">
            {#if activeFilters.length > 1}
              <div class="match-type-toggle">
                <span class="match-label">{$t.filters.match}</span>
                <select bind:value={matchType} on:change={triggerDebouncedFilter} class="rule-select match-select">
                  <option value="AND">{$t.filters.matchAll}</option>
                  <option value="OR">{$t.filters.matchAny}</option>
                </select>
              </div>
            {/if}

            {#each activeFilters as rule (rule.id)}
              <div class="filter-rule">
                <div class="rule-controls">
                  <button
                          class="rule-toggle-btn {rule.isNot ? 'active-not' : ''}"
                          on:click={() => { rule.isNot = !rule.isNot; handleControlChange(); }}
                          title={$t.filters.invertRule}>
                    NOT
                  </button>
                  <select bind:value={rule.field} class="rule-select" on:change={() => handleFieldChange(rule)}>
                    {#each availableFields as field}
                      <option value={field.value}>{field.label}</option>
                    {/each}
                  </select>
                  <select bind:value={rule.operator} class="rule-select" on:change={handleControlChange}>
                    {#each operatorDefinitions[rule.type] as op}
                      <option value={op.value}>{op.label}</option>
                    {/each}
                  </select>
                  <button class="icon-btn-small btn-remove-rule" on:click={() => removeFilterRule(rule.id)}>
                    <X size={14} />
                  </button>
                </div>

                <div class="rule-input-row">
                  {#if rule.inputType === 'text'}
                    <input
                            type="text"
                            bind:value={rule.value}
                            placeholder="..."
                            class="rule-input"
                            on:input={triggerDebouncedFilter}
                    />
                    <button
                            class="rule-toggle-btn {rule.caseSensitive ? 'active-cs' : ''}"
                            on:click={() => { rule.caseSensitive = !rule.caseSensitive; handleControlChange(); }}
                            title={$t.filters.caseSensitive}>
                      Aa
                    </button>
                  {:else if rule.inputType === 'number'}
                    <input
                            type="number"
                            bind:value={rule.value}
                            placeholder="0"
                            class="rule-input"
                            on:input={triggerDebouncedFilter}
                    />
                  {:else if rule.inputType === 'date'}
                    <input
                            type="date"
                            bind:value={rule.value}
                            class="rule-input"
                            on:input={triggerDebouncedFilter}
                    />
                  {/if}
                </div>
              </div>
            {/each}

            <button class="btn-secondary add-rule-btn" on:click={addFilterRule}>
              <Plus size={14} /> {$t.filters.addRule}
            </button>
          </div>
        </div>
      {/if}
    </aside>
  </main>
</div>

{#if showExportModal}
  <ExportModal on:close={() => showExportModal = false} />
{/if}

{#if showSettingsModal}
  <SettingsModal onClose={() => showSettingsModal = false} />
{/if}

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .icon-btn.active {
    background-color: #e6f7ff;
    color: #0066cc;
    border-color: #91d5ff;
  }

  .top-bar {
    height: 36px;
    background-color: #e3e3e3;
    border-bottom: 1px solid #ccc;
    display: flex;
    align-items: center;
    padding: 0 8px;
    flex-shrink: 0;
  }

  .menu-bar {
    display: flex;
    gap: 4px;
  }

  .menu-container {
    position: relative;
  }

  .menu-btn {
    background: transparent;
    border: none;
    padding: 4px 10px;
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
    color: #333;
  }

  .menu-btn:hover, .menu-btn.active {
    background-color: #d0d0d0;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: #ffffff;
    border: 1px solid #ccc;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    min-width: 180px;
    z-index: 1000;
    padding: 4px 0;
    border-radius: 4px;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 16px;
    background: transparent;
    border: none;
    font-size: 13px;
    color: #333;
    cursor: pointer;
  }

  .dropdown-item:hover {
    background-color: #e0e0e0;
  }

  .dropdown-divider {
    height: 1px;
    background-color: #e0e0e0;
    margin: 4px 0;
  }

  .workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .center-stage {
    flex: 1;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .active-filters-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    min-height: 40px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .active-filters-label {
    font-size: 12px;
    font-weight: 600;
    color: #555;
    white-space: nowrap;
  }

  .filter-chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex: 1;
  }

  .filter-chip {
    display: flex;
    align-items: center;
    background-color: #e3f2fd;
    border: 1px solid #bbdefb;
    border-radius: 16px;
    padding: 2px 4px 2px 10px;
    font-size: 12px;
    color: #0d47a1;
  }

  .chip-text-btn {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    margin-right: 6px;
  }

  .chip-text-btn:hover {
    text-decoration: underline;
  }

  .chip-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #bbdefb;
    border: none;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    color: #0d47a1;
    cursor: pointer;
    padding: 0;
  }

  .chip-remove:hover {
    background: #90caf9;
    color: #b71c1c;
  }

  .grid-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .multi-select-banner {
    background-color: #e6f7ff;
    color: #0066cc;
    font-size: 12px;
    font-weight: bold;
    padding: 4px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #91d5ff;
  }

  .btn-exit-mode {
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    cursor: pointer;
  }

  .btn-exit-mode:hover {
    background: #0052a3;
  }

  .side-panel {
    background-color: #f0f0f0;
    border-left: 1px solid #ccc;
    transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
  }

  .side-panel.toolbar-mode {
    width: 48px;
    align-items: center;
    padding: 12px 0;
  }

  .side-panel.wide-panel {
    width: 380px;
  }

  .panel-content {
    padding: 16px;
    height: 100%;
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
  }

  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    align-items: center;
  }

  .batch-actions-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
  }

  .batch-count {
    background-color: #0066cc;
    color: white;
    font-size: 12px;
    font-weight: bold;
    border-radius: 12px;
    padding: 2px 8px;
    margin-bottom: 2px;
  }

  .batch-label {
    font-size: 10px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    color: #444;
    transition: all 0.1s;
  }

  .icon-btn.primary {
    background-color: #0066cc;
    color: white;
  }

  .icon-btn.primary:hover {
    background-color: #0052a3;
  }

  .icon-btn.danger {
    color: #d32f2f;
  }

  .icon-btn.danger:hover:not(:disabled) {
    background-color: #ffebee;
    border-color: #ffcdd2;
    color: #b71c1c;
  }

  .icon-btn:hover:not(:disabled):not(.danger):not(.primary) {
    background-color: #e0e0e0;
    border-color: #ccc;
    color: #1a1a1a;
  }

  .icon-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .toolbar-divider {
    width: 24px;
    height: 1px;
    background-color: #ccc;
    margin: 4px 0;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ccc;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    color: #1a1a1a;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .close-btn {
    width: 28px;
    height: 28px;
  }

  .btn-clear {
    background: none;
    border: none;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .btn-clear:hover {
    background-color: #e0e0e0;
    color: #1a1a1a;
  }

  .filter-rules-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .filter-rule {
    background-color: #ffffff;
    border: 1px solid #ccc;
    border-radius: 6px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rule-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .rule-input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .rule-select {
    flex: 1;
    padding: 4px;
    font-size: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #f9f9f9;
  }

  .rule-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
  }

  .rule-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .icon-btn-small {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .icon-btn-small:hover {
    background-color: #f0f0f0;
    color: #d32f2f;
  }

  .rule-toggle-btn {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    transition: all 0.1s;
  }

  .rule-toggle-btn:hover {
    background: #e0e0e0;
  }

  .rule-toggle-btn.active-not {
    background-color: #ffebee;
    color: #c62828;
    border-color: #ef9a9a;
  }

  .rule-toggle-btn.active-cs {
    background-color: #e3f2fd;
    color: #1565c0;
    border-color: #90caf9;
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: #ffffff;
    color: #333;
    border: 1px dashed #ccc;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    margin-top: 4px;
  }

  .btn-secondary:hover {
    background: #f9f9f9;
    border-color: #999;
  }

  .match-type-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background-color: #f5f5f5;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
  }

  .match-label {
    font-size: 13px;
    font-weight: 500;
    color: #333;
  }

  .match-select {
    max-width: 150px;
  }

  .view-selector {
    display: flex;
    gap: 4px;
    padding: 8px 16px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
  }

  .view-selector button {
    padding: 4px 12px;
    border: 1px solid #ccc;
    background: #fff;
    cursor: pointer;
    font-size: 12px;
    border-radius: 4px;
  }

  .view-selector button.active {
    background: #0066cc;
    color: white;
    border-color: #005bb5;
  }

  .view-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

</style>
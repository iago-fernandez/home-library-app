<script lang="ts">
  import { onMount } from 'svelte';
  import { bookStore } from '$lib/store';
  import DataGrid from '$lib/components/DataGrid.svelte';
  import BookForm from '$lib/components/BookForm.svelte';
  import type { CreateBookPayload } from '$lib/types/book';
  import { Plus, Pencil, Trash2, Filter, Settings, X, Search } from 'lucide-svelte';

  let activePanel: 'actions' | 'addBook' | 'editBook' | 'filter' = 'actions';

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

  const availableFields: { value: string, label: string, type: FieldType, inputType: InputHTMLType }[] = [
    { value: 'title', label: 'Title', type: 'text', inputType: 'text' },
    { value: 'author', label: 'Author', type: 'text', inputType: 'text' },
    { value: 'publisher', label: 'Publisher', type: 'text', inputType: 'text' },
    { value: 'publish_date', label: 'Publish Date', type: 'numeric', inputType: 'date' },
    { value: 'isbn_13', label: 'ISBN', type: 'text', inputType: 'text' },
    { value: 'location_room', label: 'Room', type: 'text', inputType: 'text' },
    { value: 'location_bookcase', label: 'Bookcase', type: 'text', inputType: 'text' }
  ];

  const operatorDefinitions: Record<FieldType, { value: string, label: string }[]> = {
    text: [
      { value: '_contains', label: 'Contains' },
      { value: '_exact', label: 'Is exactly' },
      { value: '_starts', label: 'Starts with' },
      { value: '_ends', label: 'Ends with' }
    ],
    numeric: [
      { value: '_exact', label: 'Equals exactly' },
      { value: '_gt', label: 'Greater than' },
      { value: '_gte', label: 'Greater or equal' },
      { value: '_lt', label: 'Less than' },
      { value: '_lte', label: 'Less or equal' }
    ]
  };

  const selectedId = bookStore.selectedId;
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
    if ($selectedId) {
      activePanel = 'editBook';
    }
  }

  function handleFilterClick() {
    activePanel = 'filter';
    if (activeFilters.length === 0) {
      addFilterRule();
    }
  }

  async function handleDeleteBookClick() {
    if ($selectedId && confirm('Are you sure you want to delete this record?')) {
      try {
        await bookStore.deleteBook($selectedId);
      } catch (error) {
        console.error(error);
      }
    }
  }

  function handleFormCancel() {
    activePanel = 'actions';
  }

  async function handleFormSubmit(payload: CreateBookPayload) {
    try {
      if (activePanel === 'editBook' && $selectedId) {
        await bookStore.updateBook($selectedId, payload);
      } else {
        await bookStore.addBook(payload);
      }
      activePanel = 'actions';
    } catch (error) {
      console.error(error);
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
      rule.operator = operatorDefinitions[fieldDef.type][0].value;

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
</script>

<svelte:window on:click={handleWindowClick} />

<div class="app-container">
  <header class="top-bar" data-tauri-drag-region>
    <nav class="menu-bar">
      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'File'} on:click={() => toggleMenu('File')}>File</button>
        {#if openMenu === 'File'}
          <div class="dropdown-menu">
            <button class="dropdown-item">New Library</button>
            <button class="dropdown-item">Settings</button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item">Exit</button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'Edit'} on:click={() => toggleMenu('Edit')}>Edit</button>
        {#if openMenu === 'Edit'}
          <div class="dropdown-menu">
            <button class="dropdown-item" on:click={() => { bookStore.toggleLocalSearch(); closeMenus(); }}>Find in view (Ctrl+F)</button>
            <button class="dropdown-item" on:click={() => { handleFilterClick(); closeMenus(); }}>Advanced Filter</button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'View'} on:click={() => toggleMenu('View')}>View</button>
        {#if openMenu === 'View'}
          <div class="dropdown-menu">
            <button class="dropdown-item">Refresh Data</button>
            <button class="dropdown-item">Toggle Sidebar</button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'Tools'} on:click={() => toggleMenu('Tools')}>Tools</button>
        {#if openMenu === 'Tools'}
          <div class="dropdown-menu">
            <button class="dropdown-item">Import ISBN List</button>
            <button class="dropdown-item">Export to CSV</button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'Help'} on:click={() => toggleMenu('Help')}>Help</button>
        {#if openMenu === 'Help'}
          <div class="dropdown-menu">
            <button class="dropdown-item">Documentation</button>
            <button class="dropdown-item">About</button>
          </div>
        {/if}
      </div>
    </nav>
  </header>

  <main class="workspace">
    <section class="center-stage">
      {#if activeFilters.filter(r => r.value.trim() !== '').length > 0}
        <div class="active-filters-bar">
          <span class="active-filters-label">Active Filters {matchType === 'OR' ? '(Any)' : '(All)'}:</span>
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
          <button class="btn-clear-chips" on:click={clearFilters}>Clear All</button>
        </div>
      {/if}
      <div class="grid-wrapper">
        <DataGrid />
      </div>
    </section>

    <aside class="side-panel" class:wide-panel={activePanel === 'addBook' || activePanel === 'editBook' || activePanel === 'filter'} class:toolbar-mode={activePanel === 'actions'}>
      {#if activePanel === 'actions'}
        <div class="toolbar">
          <button class="icon-btn" title="Add Book" on:click={handleAddBookClick}>
            <Plus size={20} strokeWidth={1.5} />
          </button>
          <button class="icon-btn" title="Edit Selected Book" disabled={!$selectedId} on:click={handleEditBookClick}>
            <Pencil size={20} strokeWidth={1.5} />
          </button>
          <button class="icon-btn" title="Remove Selected Book" disabled={!$selectedId} on:click={handleDeleteBookClick}>
            <Trash2 size={20} strokeWidth={1.5} />
          </button>

          <div class="toolbar-divider"></div>

          <button class="icon-btn" title="Find in view (Ctrl+F)" class:active={$localSearchActive} on:click={bookStore.toggleLocalSearch}>
            <Search size={20} strokeWidth={1.5} />
          </button>
          <button class="icon-btn" title="Advanced Filter" class:active={activeFilters.filter(r => r.value.trim() !== '').length > 0} on:click={handleFilterClick}>
            <Filter size={20} strokeWidth={1.5} />
          </button>
          <button class="icon-btn" title="System Settings">
            <Settings size={20} strokeWidth={1.5} />
          </button>
        </div>
      {:else if activePanel === 'addBook' || activePanel === 'editBook'}
        <div class="panel-content">
          <BookForm initialData={activePanel === 'editBook' ? selectedBook : null} onCancel={handleFormCancel} onSubmit={handleFormSubmit} />
        </div>
      {:else if activePanel === 'filter'}
        <div class="panel-content filter-panel">
          <div class="panel-header">
            <h3>Advanced Filters</h3>
            <div class="header-actions">
              <button class="btn-clear" on:click={clearFilters}>Clear</button>
              <button class="icon-btn close-btn" on:click={handleFormCancel}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div class="filter-rules-container">
            {#if activeFilters.length > 1}
              <div class="match-type-toggle">
                <span class="match-label">Match:</span>
                <select bind:value={matchType} on:change={triggerDebouncedFilter} class="rule-select match-select">
                  <option value="AND">All rules (AND)</option>
                  <option value="OR">Any rule (OR)</option>
                </select>
              </div>
            {/if}

            {#each activeFilters as rule (rule.id)}
              <div class="filter-rule">
                <div class="rule-controls">
                  <button
                          class="rule-toggle-btn {rule.isNot ? 'active-not' : ''}"
                          on:click={() => { rule.isNot = !rule.isNot; handleControlChange(); }}
                          title="Invert Rule (NOT)">
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
                            placeholder="Value..."
                            class="rule-input"
                            on:input={triggerDebouncedFilter}
                    />
                    <button
                            class="rule-toggle-btn {rule.caseSensitive ? 'active-cs' : ''}"
                            on:click={() => { rule.caseSensitive = !rule.caseSensitive; handleControlChange(); }}
                            title="Case Sensitive">
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
              <Plus size={14} /> Add Rule
            </button>
          </div>
        </div>
      {/if}
    </aside>
  </main>
</div>

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

  .btn-clear-chips {
    background: transparent;
    border: none;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .btn-clear-chips:hover {
    background-color: #e0e0e0;
    color: #1a1a1a;
  }

  .grid-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
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

  .icon-btn:hover:not(:disabled) {
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
    background-color: #f9f9f9;
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
</style>
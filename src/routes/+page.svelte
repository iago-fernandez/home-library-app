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
  }

  let activeFilters: FilterRule[] = [];
  let filterTimer: ReturnType<typeof setTimeout>;
  let lastAppliedFilters: string | undefined = undefined;

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

  const operatorDefinitions = {
    text: [
      { value: '_contains', label: 'Contains' },
      { value: '_exact', label: 'Is exactly' },
      { value: '_starts', label: 'Starts with' },
      { value: '_ends', label: 'Ends with' }
    ],
    numeric: [
      { value: '_exact', label: 'Equals exactly' },
      { value: '_gt', label: 'Greater than / After' },
      { value: '_gte', label: 'Greater or equal' },
      { value: '_lt', label: 'Less than / Before' },
      { value: '_lte', label: 'Less or equal' }
    ]
  };

  const selectedId = bookStore.selectedId;
  $: selectedBook = $bookStore.find(b => b.id === $selectedId);

  onMount(() => {
    bookStore.loadBooks();
  });

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
      value: ''
    }];
  }

  function removeFilterRule(id: string) {
    activeFilters = activeFilters.filter(rule => rule.id !== id);
    triggerDebouncedFilter();
  }

  function handleFieldChange(rule: FilterRule) {
    const previousValue = rule.value;
    const fieldDef = availableFields.find(f => f.value === rule.field);

    if (fieldDef) {
      rule.type = fieldDef.type;
      rule.inputType = fieldDef.inputType;
      rule.operator = operatorDefinitions[fieldDef.type][0].value;
      rule.value = '';
    }
    activeFilters = [...activeFilters];

    if (previousValue.trim()) {
      triggerDebouncedFilter();
    }
  }

  function handleOperatorChange(rule: FilterRule) {
    if (rule.value.trim()) {
      triggerDebouncedFilter();
    }
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

      const astNodes = validRules.map(rule => ({
        type: "CONDITION",
        field: rule.field,
        operator: rule.operator,
        value: rule.value.trim()
      }));

      let finalAst;
      if (astNodes.length === 1) {
        finalAst = astNodes[0];
      } else {
        finalAst = {
          type: "AND",
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
    addFilterRule();
  }
</script>

<div class="app-container">
  <header class="top-bar" data-tauri-drag-region>
    <nav class="menu-bar">
      <button class="menu-btn">File</button>
      <button class="menu-btn" on:click={bookStore.toggleLocalSearch}>Edit</button>
      <button class="menu-btn">View</button>
      <button class="menu-btn">Tools</button>
      <button class="menu-btn">Help</button>
    </nav>
  </header>

  <main class="workspace">
    <section class="center-stage">
      <DataGrid />
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
          <button class="icon-btn" title="Advanced Filter" on:click={handleFilterClick}>
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
            {#each activeFilters as rule (rule.id)}
              <div class="filter-rule">
                <div class="rule-controls">
                  <select bind:value={rule.field} class="rule-select" on:change={() => handleFieldChange(rule)}>
                    {#each availableFields as field}
                      <option value={field.value}>{field.label}</option>
                    {/each}
                  </select>
                  <select bind:value={rule.operator} class="rule-select" on:change={() => handleOperatorChange(rule)}>
                    {#each operatorDefinitions[rule.type] as op}
                      <option value={op.value}>{op.label}</option>
                    {/each}
                  </select>
                  <button class="icon-btn-small btn-remove-rule" on:click={() => removeFilterRule(rule.id)}>
                    <X size={14} />
                  </button>
                </div>

                {#if rule.inputType === 'text'}
                  <input
                          type="text"
                          bind:value={rule.value}
                          placeholder="Value..."
                          class="rule-input"
                          on:input={triggerDebouncedFilter}
                  />
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
  }

  .menu-bar {
    display: flex;
    gap: 4px;
  }

  .menu-btn {
    background: transparent;
    border: none;
    padding: 4px 10px;
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
  }

  .menu-btn:hover {
    background-color: #d0d0d0;
  }

  .workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .center-stage {
    flex: 1;
    background-color: #ffffff;
    padding: 8px;
    overflow-y: hidden;
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

  .rule-select {
    flex: 1;
    padding: 4px;
    font-size: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #f9f9f9;
  }

  .rule-input {
    width: 100%;
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
</style>
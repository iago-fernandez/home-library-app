<script lang="ts">
  import { onMount } from 'svelte';
  import { bookStore } from '$lib/stores/book';
  import { apiClient } from '$lib/api/client';
  import { t } from '$lib/i18n';
  import DataGrid from '$lib/components/DataGrid.svelte';
  import MosaicGrid from '$lib/components/MosaicGrid.svelte';
  import DropdownSelect from '$lib/components/DropdownSelect.svelte';
  import BookForm from '$lib/components/BookForm.svelte';
  import ExportModal from '$lib/components/ExportModal.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import BatchEditForm from '$lib/components/BatchEditForm.svelte';
  import LibraryManagerModal from '$lib/components/LibraryManagerModal.svelte';
  import MoveToLibraryModal from '$lib/components/MoveToLibraryModal.svelte';
  import UserGuideModal from '$lib/components/UserGuideModal.svelte';
  import { zoomLevel, activeShortcuts, activeViewStore } from '$lib/stores/preferences';
  import { libraryStore } from '$lib/stores/library';
  import { dialogStore } from '$lib/stores/dialog';
  import type { CreateBookPayload } from '$lib/types/book';
  import { Plus, Pencil, Trash2, Filter, Settings, X, Search, CheckSquare, Download, Table, LayoutGrid, Library, Minus, RotateCcw, FolderOutput } from 'lucide-svelte';

  let activePanel: 'actions' | 'addBook' | 'editBook' | 'filter' | 'batchEdit' = 'actions';
  let showExportModal = false;
  let showSettingsModal = false;
  let showLibraryManager = false;
  let showMoveToLibraryModal = false;
  let showUserGuideModal = false;
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

  import { availableColumns } from '$lib/stores/preferences';

  $: availableFields = availableColumns.map(col => {
      let type: FieldType = 'text';
      let inputType: InputHTMLType = 'text';
      
      const numFields = ['catalog_number', 'page_count', 'rating', 'volume_in_collection', 'volume_in_series', 'purchase_price', 'location_position'];
      const dateFields = ['publish_date', 'original_publish_date', 'purchase_date', 'date_started', 'date_finished', 'loan_date', 'expected_return_date', 'created_at', 'updated_at'];
      const boolFields = ['is_first_edition', 'is_loaned'];
      
      if (numFields.includes(col.id)) {
          type = 'numeric';
          inputType = 'number';
      } else if (dateFields.includes(col.id)) {
          type = 'numeric';
          inputType = 'date';
      } else if (boolFields.includes(col.id)) {
          type = 'text'; // We can use exact match for boolean with "true" or "false"
          inputType = 'text';
      }

      return {
          value: col.id,
          label: ($t.grid as Record<string, string>)['col_' + col.id] || col.label,
          type,
          inputType
      };
  }).sort((a, b) => a.label.localeCompare(b.label));

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

  let isPanelAnimating = false;
  let panelTimeout: any;

  $: {
    // Trigger animation state when panel changes to hide scrollbars during transition
    if (activePanel !== undefined) {
      isPanelAnimating = true;
      clearTimeout(panelTimeout);
      panelTimeout = setTimeout(() => {
        isPanelAnimating = false;
      }, 250);
    }
  }

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
    // Do not process clicks on elements that were immediately removed from DOM (e.g. closing modals)
    if (!document.contains(target)) return;

    if (!target.closest('.menu-container')) {
      closeMenus();
    }
    
    if ($selectedIds.length > 0) {
        const isOutsideGrid = !target.closest('.table-wrapper') && !target.closest('.mosaic-wrapper');
        
        const isModal = !!target.closest('.modal-overlay');
        const isBatchPanel = !!target.closest('.batch-edit-panel');
        const isEditPanel = activePanel === 'editBook' && !!target.closest('.side-panel');
        
        const inBar = !!(target.closest('.top-bar') || target.closest('.toolbar') || target.closest('.side-panel'));
        const isInteractive = !!(target.closest('button') || target.closest('.dropdown-menu') || target.closest('input') || target.closest('select') || target.closest('textarea') || target.closest('label') || target.closest('a'));
        const isProtectedBarClick = inBar && isInteractive;

        if (isOutsideGrid && !isModal && !isBatchPanel && !isEditPanel && !isProtectedBarClick) {
            bookStore.clearSelection();
        }
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
    if ($selectedIds.length === 0) return;
    
    const count = $selectedIds.length;
    const msg = count === 1 
      ? $t.actions.confirmDelete 
      : `${count} ${$t.actions.confirmBatchDelete}`;

    if (await dialogStore.confirm({
      title: $t.actions.deleteSelected,
      message: msg,
      isDanger: true
    })) {
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

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (typeof document !== 'undefined' && document.activeElement?.classList.contains('shortcut-btn')) {
        return;
    }

    const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
    
    const keyCombo = [
      e.ctrlKey ? 'ctrl' : '',
      e.altKey ? 'alt' : '',
      e.shiftKey ? 'shift' : '',
      e.key.toLowerCase()
    ].filter(Boolean).join('+');

    const sc = $activeShortcuts;

    // Skip if user is typing in an input and the shortcut has NO modifiers
    if (isInput && !e.ctrlKey && !e.altKey) {
        if (e.key === 'Escape') {
            if (openMenu) { closeMenus(); return; }
            if (showExportModal || showSettingsModal) { showExportModal = false; showSettingsModal = false; return; }
            return; // Allow the input itself to handle Escape (like closing an autocomplete dropdown)
        } else {
            return;
        }
    }

    if (keyCombo === sc.newBook) {
      e.preventDefault();
      e.stopPropagation();
      activePanel = 'addBook';
    } else if (keyCombo === sc.search) {
      e.preventDefault();
      e.stopPropagation();
      bookStore.toggleLocalSearch();
    } else if (keyCombo === sc.toggleMultiSelect) {
      e.preventDefault();
      e.stopPropagation();
      bookStore.toggleMultiSelectMode();
    } else if (keyCombo === sc.deleteSelected && $selectedIds.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      handleBatchDeleteClick();
    } else if (keyCombo === sc.settings) {
      e.preventDefault();
      e.stopPropagation();
      showSettingsModal = true;
    } else if (keyCombo === sc.export) {
      e.preventDefault();
      e.stopPropagation();
      showExportModal = true;
    } else if (keyCombo === sc.editBook && $selectedIds.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      activePanel = $selectedIds.length === 1 ? 'editBook' : 'batchEdit';
    } else if (keyCombo === sc.moveBook && $selectedIds.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      showMoveToLibraryModal = true;
    } else if (keyCombo === sc.zoomIn) {
      e.preventDefault();
      e.stopPropagation();
      $zoomLevel = Math.min($zoomLevel + 10, 200);
    } else if (keyCombo === sc.zoomOut) {
      e.preventDefault();
      e.stopPropagation();
      $zoomLevel = Math.max($zoomLevel - 10, 50);
    } else if (keyCombo === sc.zoomReset) {
      e.preventDefault();
      e.stopPropagation();
      $zoomLevel = 100;
    } else if (e.key === 'Escape') {
        if (openMenu) { closeMenus(); return; }
        if (showExportModal || showSettingsModal) { showExportModal = false; showSettingsModal = false; return; }
        if ($localSearchActive) { bookStore.toggleLocalSearch(); return; }
        if (activePanel !== 'actions') { handleFormCancel(); return; }
        if ($selectedIds.length > 0) { bookStore.clearSelection(); return; }
        if ($multiSelectMode) { bookStore.toggleMultiSelectMode(); return; }
    }
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
        bookStore.updateBook($selectedId, payload).catch(e => {
            console.error("Failed to update book", e);
        });
      } else {
        if ($libraryStore.activeLibraryId) {
            payload.library_id = $libraryStore.activeLibraryId;
        }
        bookStore.addBook(payload).catch(e => {
            console.error("Failed to add book", e);
        });
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

    let text = `${fieldLabel} ${rule.isNot ? $t.filters.notRule + ' ' : ''}${opLabel} "${rule.value}"`;
    if (rule.caseSensitive) text += ' (Aa)';
    return text;
  }

  function formatShortcut(key: string | undefined): string {
    if (!key) return '';
    return key.replace(/ctrl/i, 'Ctrl').replace(/alt/i, 'Alt').replace(/shift/i, 'Shift').toUpperCase();
  }
</script>

<svelte:window on:click={handleWindowClick} on:keydown|capture={handleGlobalKeydown} />

<div class="app-container">
  <header class="top-bar" style="background-color: var(--topbar-bg);">
    <nav class="menu-bar">
      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'File'} on:click={() => toggleMenu('File')}>{$t.menu.file}</button>
        {#if openMenu === 'File'}
          <div class="dropdown-menu">
            <button class="dropdown-item" on:click={() => { showSettingsModal = true; closeMenus(); }}>
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:16px;">
                <span>{$t.menu.settings}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">({formatShortcut($activeShortcuts.settings)})</span>
              </div>
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
            <button class="dropdown-item" on:click={() => { activePanel = 'addBook'; closeMenus(); }}>
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:16px;">
                <span>{$t.menu.addBook}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">({formatShortcut($activeShortcuts.newBook)})</span>
              </div>
            </button>
            <button class="dropdown-item" on:click={() => { if ($selectedIds.length > 0) { activePanel = $selectedIds.length === 1 ? 'editBook' : 'batchEdit'; closeMenus(); } }} disabled={$selectedIds.length === 0}>
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:16px;">
                <span>{$selectedIds.length > 1 ? $t.menu.editBooks : $t.menu.editBook}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">({formatShortcut($activeShortcuts.editBook)})</span>
              </div>
            </button>
            <button class="dropdown-item" on:click={() => { if ($selectedIds.length > 0) { handleBatchDeleteClick(); closeMenus(); } }} disabled={$selectedIds.length === 0}>
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:16px;">
                <span>{$selectedIds.length > 1 ? $t.menu.deleteBooks : $t.menu.deleteBook}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">({formatShortcut($activeShortcuts.deleteSelected)})</span>
              </div>
            </button>
            <button class="dropdown-item" on:click={() => { if ($selectedIds.length > 0) { showMoveToLibraryModal = true; closeMenus(); } }} disabled={$selectedIds.length === 0}>
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:16px;">
                <span>{$selectedIds.length > 1 ? $t.menu.moveBooks : $t.menu.moveBook}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">({formatShortcut($activeShortcuts.moveBook)})</span>
              </div>
            </button>
            <div class="menu-divider" style="height: 1px; background-color: var(--border-color); margin: 4px 0;"></div>
            <button class="dropdown-item" on:click={() => { bookStore.toggleMultiSelectMode(); closeMenus(); }}>
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:16px;">
                <span>{$multiSelectMode ? $t.menu.exitMultiSelect : $t.menu.enterMultiSelect}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">({formatShortcut($activeShortcuts.toggleMultiSelect)})</span>
              </div>
            </button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'View'} on:click={() => toggleMenu('View')}>{$t.menu.view}</button>
        {#if openMenu === 'View'}
          <div class="dropdown-menu">
            <div class="dropdown-item zoom-control" style="display:flex; justify-content:space-between; align-items:center; cursor: default; padding-top: 6px; padding-bottom: 6px;">
              <span>Zoom</span>
              <div style="display:flex; align-items:center; gap: 4px;">
                <button class="zoom-btn" on:click|stopPropagation={() => $zoomLevel = Math.max($zoomLevel - 10, 50)} title="{$t.menu.zoomOut}"><Minus size={14}/></button>
                <input 
                  type="number" 
                  min="50" max="200" step="5"
                  bind:value={$zoomLevel}
                  on:blur={() => $zoomLevel = Math.max(50, Math.min(200, $zoomLevel))}
                  class="zoom-input"
                />
                <button class="zoom-btn" on:click|stopPropagation={() => $zoomLevel = Math.min($zoomLevel + 10, 200)} title="{$t.menu.zoomIn}"><Plus size={14}/></button>
              </div>
            </div>
            <button class="dropdown-item" on:click={() => { bookStore.loadBooks(); closeMenus(); }}>
              <div style="display:flex; justify-content:space-between; width:100%">
                <span>{$t.common.refresh}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">(F5)</span>
              </div>
            </button>
            <div class="menu-divider" style="height: 1px; background-color: var(--border-color); margin: 4px 0;"></div>
            <button class="dropdown-item" style="display:flex; align-items:center;" on:click={() => { $activeViewStore = 'table'; closeMenus(); }}>
              <span class="radio-icon" class:selected={$activeViewStore === 'table'}></span> {$t.actions.tableView}
            </button>
            <button class="dropdown-item" style="display:flex; align-items:center;" on:click={() => { $activeViewStore = 'mosaic'; closeMenus(); }}>
              <span class="radio-icon" class:selected={$activeViewStore === 'mosaic'}></span> {$t.actions.mosaicView}
            </button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'Tools'} on:click={() => toggleMenu('Tools')}>{$t.menu.tools}</button>
        {#if openMenu === 'Tools'}
          <div class="dropdown-menu">
            <button class="dropdown-item" on:click={() => { bookStore.toggleLocalSearch(); closeMenus(); }}>
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:16px;">
                <span>{$t.menu.findInView}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">({formatShortcut($activeShortcuts.search)})</span>
              </div>
            </button>
            <button class="dropdown-item" on:click={() => { handleFilterClick(); closeMenus(); }}>
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:16px;">
                <span>{$t.menu.advancedFilter}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">(CTRL+SHIFT+F)</span>
              </div>
            </button>
            <div class="menu-divider" style="height: 1px; background-color: var(--border-color); margin: 4px 0;"></div>
            <button class="dropdown-item" on:click={() => { showExportModal = true; closeMenus(); }}>
              <div style="display:flex; justify-content:space-between; width:100%">
                <span>{$t.menu.exportCsv}</span>
                <span class="shortcut-hint" style="opacity:0.6; font-size:0.9em;">({formatShortcut($activeShortcuts.export)})</span>
              </div>
            </button>
          </div>
        {/if}
      </div>

      <div class="menu-container">
        <button class="menu-btn" class:active={openMenu === 'Help'} on:click={() => toggleMenu('Help')}>{$t.menu.help}</button>
        {#if openMenu === 'Help'}
          <div class="dropdown-menu">
            <button class="dropdown-item" on:click={() => { showUserGuideModal = true; closeMenus(); }}>{$t.menu.userGuide}</button>
          </div>
        {/if}
      </div>
    </nav>
    <div style="flex-grow: 1;"></div>
    <div class="library-switcher" style="display:flex; align-items:center; padding-right: 4px; gap: 8px;">
        {#if $libraryStore.libraries.length > 0}
            <DropdownSelect 
                options={$libraryStore.libraries.map(l => ({ value: l.id, label: l.name }))}
                value={$libraryStore.activeLibraryId || ''}
                on:change={(e) => libraryStore.setActiveLibrary(e.detail.value)}
                customClass="library-dropdown"
                placeholder="Select Library"
                align="right"
            />
        {/if}
        <button class="icon-btn" title="Manage Libraries" on:click={() => showLibraryManager = true} style="background: transparent; border: none; cursor: pointer; color: var(--text-muted); display:flex; padding: 4px; border-radius:4px;">
            <Settings size={18} />
        </button>
    </div>
  </header>

  <main class="workspace" class:animating-panel={isPanelAnimating}>
    <section class="center-stage">
      <div class="grid-wrapper">
        <div class="view-container">
          {#if $activeViewStore === 'table'}
            <DataGrid on:edit={handleEditBookClick} />
          {:else if $activeViewStore === 'mosaic'}
            <MosaicGrid on:edit={handleEditBookClick} />
          {/if}
        </div>

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

        {#if $multiSelectMode}
          <div class="multi-select-banner">
            <span>{$t.actions.multiSelectActive} ({$selectedIds.length} {$t.common.selected})</span>
            <button class="btn-exit-mode" on:click={bookStore.toggleMultiSelectMode}>{$t.actions.exit}</button>
          </div>
        {/if}
      </div>
    </section>

    <aside class="side-panel" class:wide-panel={activePanel === 'addBook' || activePanel === 'editBook' || activePanel === 'filter' || activePanel === 'batchEdit'} class:toolbar-mode={activePanel === 'actions'}>
      {#if activePanel === 'actions'}
        <div class="toolbar">
          {#if $selectedIds.length > 0}
            <div class="batch-actions-container">
              <div class="toolbar-divider" style="display: none;"></div>

              <button class="icon-btn" title={$t.actions.editSelected} on:click={handleEditBookClick}>
                <Pencil size={20} strokeWidth={1.5} />
              </button>

              <button class="icon-btn" title={$t.actions.exportSelected} on:click={() => showExportModal = true}>
                <Download size={20} strokeWidth={1.5} />
              </button>

              <button class="icon-btn" title={$t.menu.moveBook} on:click={() => showMoveToLibraryModal = true}>
                <FolderOutput size={20} strokeWidth={1.5} />
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

            <button class="icon-btn" title={$t.actions.export} on:click={() => showExportModal = true}>
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

            <div style="flex-grow: 1;"></div>
          {/if}

          <div style="flex-grow: 1;"></div>

          <div class="view-controls">
            <div class="view-toggle">
              <button class="icon-btn" title={$t.actions.tableView} class:active={$activeViewStore === 'table'} on:click={() => $activeViewStore = 'table'}>
                <Table size={18} />
              </button>
              <button class="icon-btn" title={$t.actions.mosaicView} class:active={$activeViewStore === 'mosaic'} on:click={() => $activeViewStore = 'mosaic'}>
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>
        </div>
      {:else if activePanel === 'addBook' || activePanel === 'editBook'}
        <div class="panel-content">
          <BookForm initialData={activePanel === 'editBook' ? selectedBook : null} onCancel={handleFormCancel} onSubmit={handleFormSubmit} />
        </div>
      {:else if activePanel === 'batchEdit'}
        <div class="panel-content">
          <BatchEditForm onCancel={handleFormCancel} />
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
                <div style="width: 120px;">
                  <DropdownSelect
                    options={[
                      { value: 'AND', label: $t.filters.matchAll },
                      { value: 'OR', label: $t.filters.matchAny }
                    ]}
                    bind:value={matchType}
                    on:change={triggerDebouncedFilter}
                    customClass="rule-select match-select"
                  />
                </div>
              </div>
            {/if}

            {#each activeFilters as rule (rule.id)}
              <div class="filter-rule">
                <div class="rule-controls">
                  <button
                          class="rule-toggle-btn"
                          class:active-not={rule.isNot}
                          on:click={() => { rule.isNot = !rule.isNot; handleControlChange(); }}
                          title={$t.filters.invertRule}>
                    {$t.filters.notRule}
                  </button>
                  <DropdownSelect
                    options={availableFields}
                    bind:value={rule.field}
                    on:change={() => handleFieldChange(rule)}
                    customClass="rule-select"
                  />
                  <DropdownSelect
                    options={operatorDefinitions[rule.type]}
                    bind:value={rule.operator}
                    on:change={handleControlChange}
                    customClass="rule-select"
                  />
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
                            class="rule-toggle-btn"
                            class:active-cs={rule.caseSensitive}
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

{#if showUserGuideModal}
  <UserGuideModal onClose={() => showUserGuideModal = false} />
{/if}

<LibraryManagerModal bind:isOpen={showLibraryManager} />
<MoveToLibraryModal bind:isOpen={showMoveToLibraryModal} selectedBookIds={$selectedIds} />

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-x: hidden;
  }

  .icon-btn.active {
    background-color: var(--secondary-color);
    color: var(--primary-color);
    border-color: var(--primary-color);
  }

  .top-bar {
    height: 48px;
    background-color: var(--topbar-bg, #334155);
    border-bottom: 1px solid var(--topbar-border, #1E293B);
    display: flex;
    align-items: center;
    padding: 0 16px;
    flex-shrink: 0;
    z-index: 2000;
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
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 6px;
    color: #F8FAFC; /* Slate 50 - Off white */
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .menu-btn:hover, .menu-btn.active {
    background-color: #475569; /* Slate 600 */
    color: #FFFFFF;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background-color: var(--panel-bg);
    border: 1px solid var(--border-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    min-width: 200px;
    z-index: 1000;
    padding: 6px;
    border-radius: 8px;
    animation: fadeIn 0.15s ease-out;
    white-space: nowrap;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 16px;
    background: transparent;
    border: none;
    font-size: 13px;
    color: var(--text-main);
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.15s ease;
    margin-bottom: 2px;
  }

  .dropdown-item:hover {
    background-color: var(--bg-color);
  }

  .dropdown-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dropdown-item:disabled:hover {
    background-color: transparent;
  }

  .dropdown-item.zoom-control:hover {
    background-color: transparent;
  }

  .zoom-btn {
    background: none;
    border: none;
    color: var(--text-main);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.15s ease;
  }

  .zoom-btn:hover {
    background-color: var(--border-color);
  }

  .zoom-input {
    font-size: 13px;
    width: 5ch;
    text-align: center;
    background: transparent;
    border: none;
    color: var(--text-main);
    padding: 2px 0;
    -moz-appearance: textfield;
    appearance: textfield;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .zoom-input:focus {
    outline: none;
    background-color: var(--bg-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }

  .zoom-input::-webkit-outer-spin-button,
  .zoom-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .dropdown-divider {
    height: 1px;
    background-color: var(--border-color);
    margin: 4px 0;
  }

  .radio-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--text-main);
    margin-right: 12px;
    box-sizing: border-box;
  }
  .radio-icon.selected {
    border-color: var(--primary-color);
  }
  .radio-icon.selected::after {
    content: '';
    width: 8px;
    height: 8px;
    background-color: var(--primary-color);
    border-radius: 50%;
  }

  .workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .center-stage {
    flex: 1;
    background-color: var(--bg-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .active-filters-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background-color: var(--bg-color);
    border-top: 1px solid var(--border-color);
    min-height: 40px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .active-filters-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .btn-clear-chips {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .btn-clear-chips:hover {
    background-color: var(--panel-bg);
    color: var(--text-main);
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
    background-color: var(--secondary-color);
    border: 1px solid color-mix(in srgb, var(--primary-color) 40%, transparent);
    border-radius: 16px;
    padding: 2px 4px 2px 10px;
    font-size: 12px;
    color: var(--text-main);
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
    background: var(--border-color);
    border: none;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    color: var(--primary-color);
    cursor: pointer;
    padding: 0;
  }

  .chip-remove:hover {
    background: var(--accent-color);
    color: white;
  }

  .grid-wrapper {
    flex: 1;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    background-color: var(--panel-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin: 16px 16px 16px 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  }

  .multi-select-banner {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--primary-color);
    color: white;
    padding: 8px 16px;
    border-radius: 24px;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 50;
    font-size: 13px;
    font-weight: 600;
  }

  .btn-exit-mode {
    background: white;
    color: var(--primary-color);
    border: none;
    border-radius: 6px;
    padding: 4px 12px;
    font-size: 12px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.2s, transform 0.1s;
  }

  .btn-exit-mode:hover {
    background: #f1f5f9; /* Slate 100 */
  }
  .btn-exit-mode:active {
    transform: scale(0.95);
  }

  .side-panel {
    background-color: var(--panel-bg);
    border-left: 1px solid var(--border-color);
    transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    overflow-x: hidden;
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
    height: 100%;
    align-items: center;
  }

  .batch-actions-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
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
    color: var(--text-main);
    transition: all 0.1s;
  }

  .icon-btn.primary {
    background-color: var(--primary-color);
    color: white;
    transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px color-mix(in srgb, var(--primary-color) 30%, transparent);
  }

  .icon-btn.primary:hover {
    background-color: var(--primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px color-mix(in srgb, var(--primary-color) 40%, transparent);
  }
  
  .icon-btn.primary:active {
    transform: scale(0.95);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--primary-color) 50%, transparent);
  }

  .icon-btn.danger {
    color: var(--danger-color);
  }

  .icon-btn.danger:hover:not(:disabled) {
    background-color: var(--bg-color);
    border-color: var(--danger-color);
    color: var(--danger-color);
  }

  .icon-btn:hover:not(:disabled):not(.danger):not(.primary) {
    background-color: var(--bg-color);
    border-color: var(--border-color);
    color: var(--primary-color);
  }

  .icon-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .toolbar-divider {
    width: 24px;
    height: 1px;
    background-color: var(--border-color);
    margin: 4px 0;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-main);
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
    color: var(--text-muted);
    font-size: 12px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .btn-clear:hover {
    background-color: var(--bg-color);
    color: var(--text-main);
  }

  .filter-rules-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .filter-rule {
    background-color: var(--panel-bg);
    border: 1px solid var(--border-color);
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

  .rule-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
    background-color: var(--panel-bg);
    color: var(--text-main);
  }

  .rule-input:focus {
    outline: none;
    border-color: var(--input-focus);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  .icon-btn-small {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .icon-btn-small:hover {
    background-color: var(--bg-color);
    color: var(--danger-color);
  }

  .rule-toggle-btn {
    background-color: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.1s;
  }

  .rule-toggle-btn:hover {
    background-color: var(--border-color);
    color: var(--text-main);
  }

  .rule-toggle-btn.active-not {
    background-color: var(--danger-color);
    color: white;
    border-color: var(--danger-color);
  }

  .rule-toggle-btn.active-not:hover {
    background-color: #B91C1C; /* Darker red */
    color: white;
  }

  .rule-toggle-btn.active-cs {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .rule-toggle-btn.active-cs:hover {
    background-color: var(--primary-hover);
    color: white;
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: var(--button-bg);
    color: var(--text-main);
    border: 1px dashed var(--button-border);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    margin-top: 4px;
  }

  .btn-secondary:hover {
    background: var(--button-hover);
    border-color: var(--accent-color);
  }

  .match-type-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background-color: var(--bg-color);
    border-radius: 6px;
    border: 1px solid var(--border-color);
  }

  .match-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-main);
  }

  .view-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  :global(.library-dropdown) {
    width: 200px;
  }
  :global(.library-dropdown .select-button) {
    background-color: transparent !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: #fff !important;
  }
  :global(.library-dropdown .select-icon) {
    color: rgba(255, 255, 255, 0.7) !important;
  }
  :global(.library-dropdown .select-button:hover), :global(.library-dropdown .select-button:focus) {
    border-color: rgba(255, 255, 255, 0.5) !important;
  }
</style>
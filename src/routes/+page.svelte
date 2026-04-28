<script lang="ts">
  import { onMount } from 'svelte';
  import { bookStore } from '$lib/store';
  import DataGrid from '$lib/components/DataGrid.svelte';
  import BookForm from '$lib/components/BookForm.svelte';
  import type { CreateBookPayload } from '$lib/types/book';
  import { Plus, Pencil, Trash2, Filter, Settings } from 'lucide-svelte';

  let activePanel: 'actions' | 'addBook' = 'actions';

  onMount(() => {
    bookStore.loadBooks();
  });

  function handleAddBookClick() {
    activePanel = 'addBook';
  }

  function handleFormCancel() {
    activePanel = 'actions';
  }

  async function handleFormSubmit(payload: CreateBookPayload) {
    try {
      await bookStore.addBook(payload);
      activePanel = 'actions';
    } catch (error) {
      console.error(error);
    }
  }
</script>

<div class="app-container">
  <header class="top-bar" data-tauri-drag-region>
    <nav class="menu-bar">
      <button class="menu-btn">File</button>
      <button class="menu-btn">Edit</button>
      <button class="menu-btn">View</button>
      <button class="menu-btn">Tools</button>
      <button class="menu-btn">Help</button>
    </nav>
  </header>

  <main class="workspace">
    <section class="center-stage">
      <DataGrid />
    </section>

    <aside class="side-panel" class:wide-panel={activePanel === 'addBook'} class:toolbar-mode={activePanel === 'actions'}>
      {#if activePanel === 'actions'}
        <div class="toolbar">
          <button class="icon-btn" title="Add Book" on:click={handleAddBookClick}>
            <Plus size={20} strokeWidth={1.5} />
          </button>
          <button class="icon-btn" title="Edit Selected Book">
            <Pencil size={20} strokeWidth={1.5} />
          </button>
          <button class="icon-btn" title="Remove Selected Book">
            <Trash2 size={20} strokeWidth={1.5} />
          </button>

          <div class="toolbar-divider"></div>

          <button class="icon-btn" title="Filter Records">
            <Filter size={20} strokeWidth={1.5} />
          </button>
          <button class="icon-btn" title="System Settings">
            <Settings size={20} strokeWidth={1.5} />
          </button>
        </div>
      {:else if activePanel === 'addBook'}
        <div class="panel-content">
          <BookForm onCancel={handleFormCancel} onSubmit={handleFormSubmit} />
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

  .icon-btn:hover {
    background-color: #e0e0e0;
    border-color: #ccc;
    color: #1a1a1a;
  }

  .toolbar-divider {
    width: 24px;
    height: 1px;
    background-color: #ccc;
    margin: 4px 0;
  }
</style>
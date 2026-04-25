<script lang="ts">
  import { onMount } from 'svelte';
  import { bookStore } from '$lib/store';
  import DataGrid from '$lib/components/DataGrid.svelte';

  onMount(() => {
    bookStore.loadMockData();
  });
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

    <aside class="action-panel">
      <div class="action-group">
        <button class="action-btn">Add Book</button>
        <button class="action-btn">Edit Book</button>
        <button class="action-btn">Remove Book</button>
      </div>

      <div class="action-group">
        <button class="action-btn">Filter Books</button>
        <button class="action-btn">Settings</button>
      </div>
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

  .action-panel {
    width: 220px;
    background-color: #f0f0f0;
    border-left: 1px solid #ccc;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .action-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .action-btn {
    background-color: #ffffff;
    border: 1px solid #ccc;
    padding: 8px 12px;
    text-align: left;
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.1s;
  }

  .action-btn:hover {
    background-color: #e8e8e8;
  }
</style>
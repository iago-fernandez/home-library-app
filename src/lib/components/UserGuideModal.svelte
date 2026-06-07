<script lang="ts">
    import { t } from '$lib/i18n';
    import { X, Info, Layout, BookPlus, Edit3, Search, Library, Keyboard, AlertTriangle } from 'lucide-svelte';

    export let onClose: () => void;

    let activeTab: string = 'introduction';

    const tabs = [
        { id: 'introduction', icon: Info },
        { id: 'interface', icon: Layout },
        { id: 'addingBooks', icon: BookPlus },
        { id: 'editingDeleting', icon: Edit3 },
        { id: 'searchFilter', icon: Search },
        { id: 'libraries', icon: Library },
        { id: 'shortcuts', icon: Keyboard },
        { id: 'limitations', icon: AlertTriangle }
    ] as const;
</script>

<div class="modal-overlay" role="presentation" on:mousedown|self={onClose}>
    <div class="modal-container user-guide-modal">
        <header class="modal-header">
            <h2>{$t.userGuide.title}</h2>
            <button class="close-btn" on:click={onClose}>
                <X size={20} />
            </button>
        </header>

        <div class="modal-body">
            <nav class="settings-nav">
                {#each tabs as tab}
                    <div class="nav-section">
                        <button class="accordion-header" class:active={activeTab === tab.id} on:click={() => activeTab = tab.id}>
                            <svelte:component this={tab.icon} size={18} />
                            {$t.userGuide.sections[tab.id]}
                        </button>
                    </div>
                {/each}
            </nav>

            <section class="settings-content scroll-pane">
                <div class="guide-content">
                    {#if activeTab === 'introduction'}
                        <div class="setting-group">
                            <h3 class="section-title">{$t.userGuide.introduction.title}</h3>
                            <p class="guide-text">{$t.userGuide.introduction.p1}</p>
                            <p class="guide-text">{$t.userGuide.introduction.p2}</p>
                        </div>
                    {:else if activeTab === 'interface'}
                        <div class="setting-group">
                            <h3 class="section-title">{$t.userGuide.interface.title}</h3>
                            
                            <h4 class="guide-subtitle">{$t.userGuide.interface.topbar}</h4>
                            <p class="guide-text">{$t.userGuide.interface.topbarDesc}</p>

                            <h4 class="guide-subtitle">{$t.userGuide.interface.workspace}</h4>
                            <p class="guide-text">{$t.userGuide.interface.workspaceDesc}</p>

                            <h4 class="guide-subtitle">{$t.userGuide.interface.views}</h4>
                            <p class="guide-text">{$t.userGuide.interface.viewsDesc}</p>
                        </div>
                    {:else if activeTab === 'addingBooks'}
                        <div class="setting-group">
                            <h3 class="section-title">{$t.userGuide.addingBooks.title}</h3>

                            <h4 class="guide-subtitle">{$t.userGuide.addingBooks.isbn}</h4>
                            <p class="guide-text">{$t.userGuide.addingBooks.isbnDesc}</p>

                            <h4 class="guide-subtitle">{$t.userGuide.addingBooks.barcode}</h4>
                            <p class="guide-text">{$t.userGuide.addingBooks.barcodeDesc}</p>

                            <h4 class="guide-subtitle">{$t.userGuide.addingBooks.manual}</h4>
                            <p class="guide-text">{$t.userGuide.addingBooks.manualDesc}</p>
                        </div>
                    {:else if activeTab === 'editingDeleting'}
                        <div class="setting-group">
                            <h3 class="section-title">{$t.userGuide.editingDeleting.title}</h3>

                            <h4 class="guide-subtitle">{$t.userGuide.editingDeleting.edit}</h4>
                            <p class="guide-text">{$t.userGuide.editingDeleting.editDesc}</p>

                            <h4 class="guide-subtitle">{$t.userGuide.editingDeleting.batchEdit}</h4>
                            <p class="guide-text">{$t.userGuide.editingDeleting.batchEditDesc}</p>

                            <h4 class="guide-subtitle">{$t.userGuide.editingDeleting.delete}</h4>
                            <p class="guide-text">{$t.userGuide.editingDeleting.deleteDesc}</p>
                        </div>
                    {:else if activeTab === 'searchFilter'}
                        <div class="setting-group">
                            <h3 class="section-title">{$t.userGuide.searchFilter.title}</h3>

                            <h4 class="guide-subtitle">{$t.userGuide.searchFilter.search}</h4>
                            <p class="guide-text">{$t.userGuide.searchFilter.searchDesc}</p>

                            <h4 class="guide-subtitle">{$t.userGuide.searchFilter.filters}</h4>
                            <p class="guide-text">{$t.userGuide.searchFilter.filtersDesc}</p>
                        </div>
                    {:else if activeTab === 'libraries'}
                        <div class="setting-group">
                            <h3 class="section-title">{$t.userGuide.libraries.title}</h3>

                            <h4 class="guide-subtitle">{$t.userGuide.libraries.concept}</h4>
                            <p class="guide-text">{$t.userGuide.libraries.conceptDesc}</p>

                            <h4 class="guide-subtitle">{$t.userGuide.libraries.sharing}</h4>
                            <p class="guide-text">{$t.userGuide.libraries.sharingDesc}</p>
                        </div>
                    {:else if activeTab === 'shortcuts'}
                        <div class="setting-group">
                            <h3 class="section-title">{$t.userGuide.shortcuts.title}</h3>
                            <p class="guide-text">{$t.userGuide.shortcuts.desc}</p>
                        </div>
                    {:else if activeTab === 'limitations'}
                        <div class="setting-group">
                            <h3 class="section-title">{$t.userGuide.limitations.title}</h3>
                            <p class="guide-text">{$t.userGuide.limitations.p1}</p>
                        </div>
                    {/if}
                </div>
            </section>
        </div>
    </div>
</div>

<style>
    .modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 20px;
    }

    .modal-container.user-guide-modal {
        background-color: var(--topbar-bg);
        border: 1px solid var(--topbar-border);
        border-radius: 12px;
        width: 100%;
        max-width: 900px;
        height: 85vh;
        max-height: 800px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        overflow: hidden;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--border-color);
        background: rgba(0, 0, 0, 0.2);
    }

    .modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-main);
    }

    .close-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: var(--text-main);
    }

    .modal-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    .settings-nav {
        width: 240px;
        background-color: rgba(0, 0, 0, 0.1);
        border-right: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 16px 0;
    }

    .nav-section {
        display: flex;
        flex-direction: column;
    }

    .accordion-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 20px;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }

    .accordion-header:hover {
        color: var(--text-main);
        background: rgba(255, 255, 255, 0.05);
    }

    .accordion-header.active {
        color: var(--primary-color);
        background: rgba(255, 255, 255, 0.08);
        border-right: 3px solid var(--primary-color);
    }

    .settings-content {
        flex: 1;
        padding: 32px 40px;
        overflow-y: auto;
        background-color: transparent;
    }

    .setting-group {
        margin-bottom: 2rem;
        animation: fadeIn 0.3s ease;
    }

    .section-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--text-main);
        margin: 0 0 24px 0;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border-color);
    }

    .guide-subtitle {
        font-size: 15px;
        font-weight: 600;
        color: var(--primary-color);
        margin: 24px 0 8px 0;
    }

    .guide-text {
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-muted);
        margin: 0 0 16px 0;
    }

    .scroll-pane::-webkit-scrollbar {
        width: 8px;
    }
    .scroll-pane::-webkit-scrollbar-track {
        background: transparent;
    }
    .scroll-pane::-webkit-scrollbar-thumb {
        background-color: rgba(255,255,255,0.2);
        border-radius: 4px;
    }
    .scroll-pane::-webkit-scrollbar-thumb:hover {
        background-color: rgba(255,255,255,0.3);
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>

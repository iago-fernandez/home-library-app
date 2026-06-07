<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { t } from '$lib/i18n';
    import { X, Save, Trash2, UserPlus, Shield, Plus, AlertTriangle, Pencil } from 'lucide-svelte';
    import DropdownSelect from '$lib/components/DropdownSelect.svelte';
    import DeleteLibraryModal from '$lib/components/DeleteLibraryModal.svelte';
    import AutoExpandTextarea from '$lib/components/AutoExpandTextarea.svelte';
    import { libraryStore } from '$lib/stores/library';
    import { apiClient } from '$lib/api/client';
    import { dialogStore } from '$lib/stores/dialog';
    import { authStore } from '$lib/stores/auth';
    import type { Library, LibraryMember } from '$lib/types/library';

    const dispatch = createEventDispatcher();
    export let isOpen = false;

    let activeTab: 'general' | 'members' = 'general';
    let localLibraries: Library[] = [];
    let selectedLibId: string | null = null;
    
    // General Tab
    let newLibName = '';
    let newLibDesc = '';
    let isEditing = false;
    let activeLibDesc = '';
    let activeLibName = '';

    // Delete confirmation state
    let showDeleteLibConfirm = false;
    let deleteLibPassword = '';
    let deleteLibError = '';

    // Members Tab
    let members: LibraryMember[] = [];
    let newMemberUsername = '';
    let newMemberRole: 'editor' | 'viewer' = 'viewer';
    let memberError = '';
    
    let wasOpen = false;
    
    $: if (isOpen && !wasOpen) {
        wasOpen = true;
        localLibraries = [...$libraryStore.libraries];
        selectedLibId = $libraryStore.activeLibraryId || (localLibraries.length > 0 ? localLibraries[0].id : null);
        if (selectedLibId) {
            const lib = localLibraries.find(l => l.id === selectedLibId);
            if (lib) {
                activeLibDesc = lib.description || '';
                activeLibName = lib.name || '';
            }
            loadMembers();
            activeTab = 'general';
        }
    } else if (!isOpen && wasOpen) {
        wasOpen = false;
    }


    $: ownedLibraries = localLibraries.filter(l => l.owner_id === $authStore.user?.id);
    $: sharedLibraries = localLibraries.filter(l => l.owner_id !== $authStore.user?.id);
    $: activeLib = localLibraries.find(l => l.id === selectedLibId);

    async function loadMembers() {
        if (!selectedLibId) return;
        try {
            members = await apiClient.getLibraryMembers(selectedLibId);
        } catch (e) {
            console.error(e);
            members = []; // might be unauthorized
        }
    }

    function selectLibrary(id: string) {
        selectedLibId = id;
        isEditing = false;
        memberError = '';
        showDeleteLibConfirm = false;
        deleteLibPassword = '';
        deleteLibError = '';
        const lib = localLibraries.find(l => l.id === id);
        if (lib) {
            activeLibDesc = lib.description || '';
            activeLibName = lib.name || '';
        }
        if (activeTab === 'members') loadMembers();
    }

    function cancelEditing() {
        isEditing = false;
        if (activeLib) {
            activeLibDesc = activeLib.description || '';
            activeLibName = activeLib.name || '';
        }
    }

    async function handleCreate() {
        if (!newLibName.trim()) return;
        try {
            const newLib = await apiClient.createLibrary({ name: newLibName, description: newLibDesc });
            await libraryStore.fetchLibraries();
            localLibraries = [...$libraryStore.libraries];
            selectedLibId = newLib.id;
            newLibName = '';
            newLibDesc = '';
        } catch(e) {
            console.error(e);
        }
    }

    async function handleUpdateLibDetails(id: string) {
        if (!activeLib) return;
        try {
            await apiClient.updateLibrary(id, { description: activeLibDesc, name: activeLibName });
            await libraryStore.fetchLibraries();
            localLibraries = [...$libraryStore.libraries];
            isEditing = false;
        } catch(e) {
            console.error(e);
            dialogStore.confirm({
                title: 'Error',
                message: 'Failed to update library details.',
                confirmText: 'OK',
                cancelText: ''
            });
        }
    }

    async function handleDeleteWithPassword(event: CustomEvent<string>, id: string) {
        const password = event.detail;
        if (!password) {
            deleteLibError = 'Password is required';
            return;
        }
        try {
            if ($authStore.user) {
                const isValid = await apiClient.login({ username: $authStore.user.username, password });
                if (!isValid) throw new Error('Invalid password');
            }
            await apiClient.deleteLibrary(id);
            await libraryStore.fetchLibraries();
            localLibraries = [...$libraryStore.libraries];
            if (selectedLibId === id) selectedLibId = localLibraries.length > 0 ? localLibraries[0].id : null;
            showDeleteLibConfirm = false;
            deleteLibError = '';
        } catch(e: any) {
            deleteLibError = e.message || 'Invalid password';
        }
    }

    async function handleAddMember() {
        if (!selectedLibId || !newMemberUsername.trim()) return;
        memberError = '';
        if (newMemberUsername === $authStore.user?.username) {
            memberError = $t.libraryManager?.cannotAddSelf || 'You cannot add yourself.';
            return;
        }
        try {
            await apiClient.addLibraryMember(selectedLibId, { username: newMemberUsername, role: newMemberRole });
            newMemberUsername = '';
            await loadMembers();
        } catch (e: any) {
            memberError = $t.libraryManager?.memberError || 'Error adding member. Ensure the user exists and is not already a member.';
        }
    }

    async function handleRemoveMember(userId: string) {
        if (!selectedLibId) return;
        try {
            await apiClient.removeLibraryMember(selectedLibId, userId);
            await loadMembers();
        } catch (e) {
            console.error(e);
        }
    }

    async function handleUpdateMemberRole(userId: string, newRole: 'editor' | 'viewer', username: string) {
        if (!selectedLibId) return;
        try {
            // Simulate update by removing and re-adding
            await apiClient.removeLibraryMember(selectedLibId, userId);
            await apiClient.addLibraryMember(selectedLibId, { username, role: newRole });
            await loadMembers();
        } catch(e) {
            console.error(e);
        }
    }

    function close() {
        isOpen = false;
        dispatch('close');
    }
</script>

{#if isOpen}
    <div class="modal-backdrop" on:click|self={close} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && close()}>
        <div class="modal-content">
            <header class="modal-header">
                <h2>{$t.libraryManager?.title || 'Manage Libraries'}</h2>
                <button class="close-btn" on:click={close} aria-label="Close"><X size={20} /></button>
            </header>

            <div class="modal-body">
                <div class="sidebar">
                    <div class="library-list">
                        {#if ownedLibraries.length > 0}
                            <div class="list-header">{$t.libraryManager?.myLibraries || 'My Libraries'}</div>
                            {#each ownedLibraries as lib}
                                <div class="lib-item" class:active={selectedLibId === lib.id} on:click={() => selectLibrary(lib.id)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && selectLibrary(lib.id)}>
                                    <span>{lib.name}</span>
                                </div>
                            {/each}
                        {/if}
                        
                        {#if sharedLibraries.length > 0}
                            <div class="list-header" style="margin-top: 16px;">{$t.libraryManager?.sharedLibraries || 'Shared With Me'}</div>
                            {#each sharedLibraries as lib}
                                <div class="lib-item shared" class:active={selectedLibId === lib.id} on:click={() => selectLibrary(lib.id)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && selectLibrary(lib.id)}>
                                    <span>{lib.name}</span>
                                </div>
                            {/each}
                        {/if}
                    </div>
                    <div class="create-section" style="padding: 12px 16px 24px 16px;">
                        <h4 style="margin: 8px 0 16px 0; font-weight: 600; color: var(--text-main);">{$t.libraryManager?.createNew || 'Create New'}</h4>
                        <input type="text" bind:value={newLibName} placeholder={$t.libraryManager?.libraryName || 'Library Name'} class="form-input" style="margin-bottom: 16px;" />
                        <button class="btn-create" on:click={handleCreate} disabled={!newLibName.trim()}>
                            <Plus size={16} /> {$t.libraryManager?.create || 'Create'}
                        </button>
                    </div>
                </div>

                <div class="main-content">
                    {#if activeLib}
                        <div class="tabs">
                            <button class="tab" class:active={activeTab === 'general'} on:click={() => {activeTab = 'general'; memberError = ''; newMemberUsername = ''; newMemberRole = 'viewer';}}>{$t.libraryManager?.generalTab || 'General'}</button>
                            <button class="tab" class:active={activeTab === 'members'} on:click={() => {activeTab = 'members'; memberError = ''; newMemberUsername = ''; newMemberRole = 'viewer'; loadMembers();}}>{$t.libraryManager?.membersTab || 'Members'}</button>
                        </div>

                        {#if activeTab === 'general'}
                            <div class="tab-pane">
                                <div class="header-section" style="margin-bottom: 4px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; min-height: 48px;">
                                    {#if isEditing}
                                        <div style="flex-grow: 1; min-width: 0;">
                                            <AutoExpandTextarea 
                                                bind:value={activeLibName} 
                                                customStyle="font-size: 1.5rem; font-weight: 600; padding: 7px 12px; margin-bottom: 0; background: transparent;" 
                                            />
                                        </div>
                                    {:else}
                                        <h3 style="font-size: 1.5rem; color: var(--text-main); margin: 0; flex-grow: 1; padding: 8px 12px; border: 1px solid transparent; height: 48px; line-height: 30px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{activeLib.name}</h3>
                                        {#if activeLib.owner_id === $authStore.user?.id}
                                            <button class="btn-icon" on:click={() => isEditing = true} title="Edit Library" style="padding: 8px;">
                                                <Pencil size={18} />
                                            </button>
                                        {/if}
                                    {/if}
                                </div>
                                
                                <div class="form-group" style="margin-bottom: 16px;">
                                    {#if isEditing}
                                        <AutoExpandTextarea 
                                            bind:value={activeLibDesc} 
                                            placeholder={$t.libraryManager?.noDescription || 'No description provided.'}
                                        />
                                        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 12px;">
                                            <button class="btn-cancel" on:click={cancelEditing} title={$t.common?.cancel || 'Cancel'} style="padding: 8px 16px; border: 1px solid var(--border-color); background: transparent; border-radius: 6px;">
                                                {$t.common?.cancel || 'Cancel'}
                                            </button>
                                            <button class="btn-primary" on:click={() => handleUpdateLibDetails(activeLib.id)}>
                                                <Save size={16} /> {$t.libraryManager?.saveChanges || 'Save Changes'}
                                            </button>
                                        </div>
                                    {:else}
                                        <div style="padding: 8px 12px; border: 1px solid transparent; border-radius: 6px; min-height: 74px;">
                                            <div style="color: {activeLib.description ? 'var(--text-main)' : 'var(--text-muted)'}; font-size: 0.95rem; white-space: pre-wrap; line-height: 1.5;">
                                                {activeLib.description || $t.libraryManager?.noDescription || 'No description provided.'}
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                                
                                {#if activeLib.owner_id === $authStore.user?.id}
                                    <div class="group-header" style="margin-top: 24px; margin-bottom: 16px;">
                                        <h3 class="section-title" style="color: #ff4d4f; font-weight: 600; font-size: 1.1rem; border-bottom: 1px solid rgba(255, 77, 79, 0.2); padding-bottom: 8px;">{$t.libraryManager?.dangerZone || 'Danger Zone'}</h3>
                                    </div>
                                    <div class="form-group danger-zone" style="display: flex; flex-direction: column; gap: 16px;">
                                        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 16px;">
                                            <p class="warning-text" style="flex-grow: 1; margin: 0;">{$t.libraryManager?.deleteDesc || 'This action is permanent and will delete the library and all its books. Please be certain.'}</p>
                                            <button class="btn-delete" style="flex-shrink: 0;" on:click={() => { showDeleteLibConfirm = true; deleteLibError = ''; }}>
                                                <Trash2 size={16} /> {$t.libraryManager?.deleteLibrary || 'Delete Library'}
                                            </button>
                                        </div>
                                        
                                        {#if showDeleteLibConfirm}
                                            <DeleteLibraryModal 
                                                error={deleteLibError}
                                                on:confirm={(e) => handleDeleteWithPassword(e, activeLib.id)}
                                                on:cancel={() => {showDeleteLibConfirm = false; deleteLibError = '';}}
                                            />
                                        {/if}
                                    </div>
                                {/if}
                            </div>
                        {:else if activeTab === 'members'}
                            <div class="tab-pane">
                                {#if activeLib.owner_id === $authStore.user?.id}
                                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                                        <div class="add-member-bar" style="margin-bottom: 0;">
                                            <input type="text" bind:value={newMemberUsername} on:input={() => memberError = ''} placeholder={$t.libraryManager?.memberUsername || 'Username'} class="form-input" style="margin-bottom: 0; min-width: 0;" />
                                            <DropdownSelect
                                                value={newMemberRole}
                                                on:change={(e) => newMemberRole = e.detail.value}
                                                options={[
                                                    { value: 'viewer', label: $t.libraryManager?.roleViewer || 'Viewer' },
                                                    { value: 'editor', label: $t.libraryManager?.roleEditor || 'Editor' }
                                                ]}
                                                customClass="member-dropdown"
                                            />
                                            <button class="btn-primary" on:click={handleAddMember} disabled={!newMemberUsername.trim()} style="margin-bottom: 0; white-space: nowrap;">
                                                <UserPlus size={16} /> {$t.libraryManager?.addMember || 'Add'}
                                            </button>
                                        </div>
                                        {#if memberError}
                                            <div style="display: flex; align-items: flex-start; gap: 12px; margin-top: 4px; color: #ff4d4f; font-size: 0.85rem; padding: 10px 14px; background: rgba(255, 77, 79, 0.05); border-radius: 6px; border: 1px solid rgba(255, 77, 79, 0.2);">
                                                <AlertTriangle size={16} style="flex-shrink: 0; margin-top: 1px;" />
                                                <span style="line-height: 1.4;">{memberError}</span>
                                            </div>
                                        {/if}
                                    </div>
                                {/if}
                                <div class="members-container">
                                    <ul class="member-list">
                                        {#each members as member}
                                            <li class="member-item">
                                                <div class="member-info">
                                                    <span class="member-name">{member.username}</span>
                                                </div>
                                                {#if activeLib.owner_id === $authStore.user?.id && member.role !== 'owner'}
                                                    <div style="display: flex; gap: 8px; align-items: center;">
                                                        <DropdownSelect
                                                            value={member.role}
                                                            on:change={(e) => handleUpdateMemberRole(member.user_id, e.detail.value, member.username)}
                                                            options={[
                                                                { value: 'viewer', label: $t.libraryManager?.roleViewer || 'Viewer' },
                                                                { value: 'editor', label: $t.libraryManager?.roleEditor || 'Editor' }
                                                            ]}
                                                            customClass="member-role-dropdown"
                                                        />
                                                        <button class="btn-icon danger" on:click={() => handleRemoveMember(member.user_id)} title={$t.libraryManager?.removeMember || "Remove Member"}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                {:else}
                                                    <span class="role-badge" class:owner={member.role === 'owner'} class:editor={member.role === 'editor'}>
                                                        {#if member.role === 'owner'} <Shield size={12} style="margin-right: 4px;" /> {/if}
                                                        {member.role === 'viewer' ? ($t.libraryManager?.roleViewer || 'Viewer') : (member.role === 'editor' ? ($t.libraryManager?.roleEditor || 'Editor') : 'Owner')}
                                                    </span>
                                                {/if}
                                            </li>
                                        {:else}
                                            <div style="padding: 24px; text-align: center; color: var(--text-muted);">
                                                {$t.libraryManager?.noMembers || 'No members found.'}
                                            </div>
                                        {/each}
                                    </ul>
                                </div>
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
        z-index: 1000;
        animation: fadeIn 0.15s ease-out;
    }
    .modal-content {
        background: var(--panel-bg, #fff); color: var(--text-main, #333);
        width: 800px; max-width: 95vw; height: 600px; max-height: 90vh;
        border-radius: 12px; display: flex; flex-direction: column; overflow: hidden;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .modal-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 20px 24px; border-bottom: 1px solid var(--border-color, #eee);
        background: var(--panel-bg);
    }
    .modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--text-main); }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); transition: color 0.15s; }
    .close-btn:hover { color: var(--text-main); }
    
    .modal-body {
        display: flex; flex-grow: 1; overflow: hidden;
    }
    
    .sidebar {
        width: 260px; flex-shrink: 0; border-right: 1px solid var(--border-color, #eee);
        display: flex; flex-direction: column; background: var(--bg-color, #f9f9f9);
    }
    .library-list { flex-grow: 1; overflow-y: auto; padding: 16px 12px; }
    
    .list-header {
        font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em;
        color: var(--text-muted); font-weight: 700; margin-bottom: 8px; padding-left: 12px;
    }
    
    .lib-item {
        padding: 8px 12px; border-radius: 6px; cursor: pointer; margin-bottom: 4px;
        transition: all 0.15s ease; color: var(--text-main); font-weight: 500;
        font-size: 0.9rem;
    }
    .lib-item:hover { background: var(--hover-color, #eee); }
    .lib-item.active { background: var(--primary-color); color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .lib-item.shared { border-left: 3px solid transparent; }
    .lib-item.shared.active { border-left-color: rgba(255,255,255,0.5); }
    
    .create-section { 
        padding: 8px 16px 20px 16px; border-top: 1px solid var(--border-color, #eee); 
        background: var(--panel-bg);
    }
    
    .form-input {
        width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px;
        background: var(--input-bg, #fff); color: var(--text-main); margin-bottom: 12px;
        font-family: inherit; font-size: 0.9rem; transition: border-color 0.15s;
    }
    .form-input:focus { outline: none; border-color: var(--primary-color); }
    
    .btn-create, .btn-primary {
        background: var(--primary-color); color: white; border: none; padding: 8px 16px;
        border-radius: 6px; cursor: pointer; width: 100%; font-weight: 500;
        display: flex; justify-content: center; align-items: center; gap: 8px;
        transition: background 0.15s; font-size: 0.9rem;
    }
    .btn-primary { width: auto; }
    .btn-create:hover:not(:disabled), .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
    .btn-create:disabled, .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .main-content { flex-grow: 1; display: flex; flex-direction: column; background: var(--panel-bg); overflow: hidden; }
    .tabs { display: flex; border-bottom: 1px solid var(--border-color); padding: 0 24px; background: var(--bg-color); }
    .tab {
        padding: 16px 24px; background: none; border: none; cursor: pointer;
        border-bottom: 2px solid transparent; color: var(--text-muted); font-weight: 500;
        transition: all 0.15s;
    }
    .tab:hover { color: var(--text-main); }
    .tab.active { border-bottom-color: var(--primary-color); color: var(--primary-color); font-weight: 600; }
    
    .tab-pane { padding: 32px; flex-grow: 1; overflow-y: auto; }
    
    .danger-zone {
        padding: 16px; border: 1px solid rgba(255, 77, 79, 0.3); border-radius: 8px;
        background: rgba(255, 77, 79, 0.03); display: flex; flex-direction: column; gap: 12px;
    }
    .warning-text { color: var(--text-muted); margin: 0; font-size: 0.85rem; }
    .btn-delete {
        background: rgba(255, 77, 79, 0.1); color: #ff4d4f; border: 1px solid rgba(255, 77, 79, 0.2); 
        padding: 8px 16px; border-radius: 6px; font-weight: 500; font-size: 0.9rem;
        display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.15s;
        align-self: flex-start;
    }
    .btn-delete:hover { background: #ff4d4f; color: white; }
    
    .add-member-bar { 
        display: flex; gap: 12px; margin-bottom: 24px; align-items: stretch;
        background: var(--bg-color); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);
    }
    
    .members-container { border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; }
    .member-list { list-style: none; padding: 0; margin: 0; background: var(--panel-bg); }
    .member-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-size: 0.9rem;
    }
    .member-item:last-child { border-bottom: none; }
    .member-info { display: flex; align-items: center; gap: 12px; }
    .member-name { font-weight: 500; color: var(--text-main); }
    
    .role-badge {
        font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; background: var(--hover-color);
        color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;
        display: flex; align-items: center;
    }
    .role-badge.owner { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
    .role-badge.editor { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    
    .btn-icon { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
    .btn-icon.danger { color: #ff4d4f; }
    .btn-icon:hover { background: var(--hover-color); }
    
    :global(.member-dropdown) {
        width: 140px;
    }
    :global(.member-dropdown .select-button) {
        padding: 8px 12px;
        background: var(--input-bg, #fff);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        font-size: 0.9rem;
        height: 37px;
    }

    :global(.member-role-dropdown) {
        width: 120px;
    }
    :global(.member-role-dropdown .select-button) {
        padding: 4px 8px;
        background: var(--bg-color);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        font-size: 0.85rem;
        height: 28px;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>

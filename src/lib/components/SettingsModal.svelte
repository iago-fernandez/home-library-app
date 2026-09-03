<script lang="ts">
    import { t, locale, setLocale } from '$lib/i18n';
    import { apiClient } from '$lib/api/client';
    import { authStore } from '$lib/stores/auth';
    import { dialogStore } from '$lib/stores/dialog';
    import ColumnSettings from './ColumnSettings.svelte';
    import DropdownSelect from './DropdownSelect.svelte';
    import { zoomLevel, activeTheme, appThemes, activeShortcuts, autocompleteLimit, activeDateFormat } from '$lib/stores/preferences';
    import { X, User, Sliders, Layout, Monitor, Keyboard, RotateCcw } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import DeleteAccountModal from './DeleteAccountModal.svelte';

    export let onClose: () => void;

    export let initialWorkspaceTab: 'table' | 'mosaic' = 'table';
    export let initialTab: 'account' | 'preferences' | 'workspace' = 'preferences';
    let activeTab: 'account' | 'preferences' | 'workspace' = initialTab;

    let accountUsername = '';
    let accountPassword = '';
    let confirmPassword = '';
    let accountError = '';
    let accountSuccess = false;

    let capturingKey: string | null = null;

    let showDeleteConfirm = false;
    let deletePassword = '';
    let deleteError = '';

    $: if ($authStore.user) {
        // Only set initially to avoid overwriting user input
        if (!accountUsername) {
            accountUsername = $authStore.user.username;
        }
    }

    async function handleUpdateProfile() {
        if (!accountUsername) return;
        if (accountPassword && accountPassword !== confirmPassword) {
            accountError = 'Passwords do not match';
            return;
        }
        accountError = '';
        accountSuccess = false;
        try {
            await apiClient.updateProfile({ username: accountUsername, password: accountPassword || undefined });
            accountSuccess = true;
            accountPassword = '';
            confirmPassword = '';
            setTimeout(() => accountSuccess = false, 3000);
        } catch (e: any) {
            accountError = e.message;
        }
    }

    function handleDeleteAccount() {
        showDeleteConfirm = true;
        deleteError = '';
    }

    async function executeDeleteAccount(event: CustomEvent<string>) {
        const pwd = event.detail;
        if (!pwd) {
            deleteError = 'Password is required';
            return;
        }
        
        try {
            // Re-authenticate to ensure they know the password
            if ($authStore.user) {
                const isValid = await apiClient.login({ username: $authStore.user.username, password: pwd });
                if (!isValid) throw new Error('Invalid password');
            }
            
            await apiClient.deleteAccount();
            showDeleteConfirm = false;
            onClose();
        } catch (e: any) {
            deleteError = e.message || 'Invalid password';
        }
    }

    function scrollToSection(id: string) {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function parseShortcut(sc: string): string[] {
        if (!sc) return [];
        let parts: string[] = [];
        let current = '';
        for (let i = 0; i < sc.length; i++) {
            if (sc[i] === '+' && current !== '') {
                parts.push(current);
                current = '';
            } else {
                current += sc[i];
            }
        }
        if (current) parts.push(current);
        return parts.map(p => p.toUpperCase().replace('DELETE', 'DEL').replace('CONTROL', 'CTRL'));
    }

    function changeLanguage(e: any) {
        locale.set(e.detail.value);
    }
</script>

<div class="modal-overlay" role="presentation" on:mousedown|self={onClose}>
    <div class="modal-container">
        <header class="modal-header">
            <h2>{$t.settings.title}</h2>
            <button class="close-btn" on:click={onClose}>
                <X size={20} />
            </button>
        </header>

        <div class="modal-body">
            <nav class="settings-nav">
                <div class="nav-section">
                    <button class="accordion-header" class:active={activeTab === 'preferences'} on:click={() => activeTab = 'preferences'}>
                        <Sliders size={18} />
                        {$t.settings.preferencesTab}
                    </button>
                    {#if activeTab === 'preferences'}
                        <div class="accordion-content">
                            <button class="nav-sub-item" on:click={() => scrollToSection('sec-lang')}>{$t.settings.languageSelect}</button>
                            <button class="nav-sub-item" on:click={() => scrollToSection('sec-theme')}>{$t.settings.theme}</button>
                            <button class="nav-sub-item" on:click={() => scrollToSection('sec-zoom')}>{$t.settings.zoomLevel}</button>
                            <button class="nav-sub-item" on:click={() => scrollToSection('sec-dateformat')}>{$t.settings.dateFormat || 'Date Format'}</button>
                            <button class="nav-sub-item" on:click={() => scrollToSection('sec-autocomplete')}>{$t.settings.autocompleteSuggestions}</button>
                            <button class="nav-sub-item" on:click={() => scrollToSection('sec-shortcuts')}>{$t.settings.shortcutsTab}</button>
                        </div>
                    {/if}
                </div>

                <div class="nav-section">
                    <button class="accordion-header" class:active={activeTab === 'workspace'} on:click={() => activeTab = 'workspace'}>
                        <Layout size={18} />
                        {$t.settings.workspaceTab}
                    </button>
                </div>

                <div class="nav-section">
                    <button class="accordion-header" class:active={activeTab === 'account'} on:click={() => activeTab = 'account'}>
                        <User size={18} />
                        {$t.settings.accountTab}
                    </button>
                </div>
            </nav>

            <section class="settings-content scroll-pane">
                {#if activeTab === 'account'}
                    <div id="sec-account" class="setting-group" style="padding-bottom: 2rem;">
                        <h3>{$t.settings.accountTab}</h3>
                        {#if $authStore.user}
                            <div class="form-group" style="margin-top: 24px;">
                                <div class="setting-label" style="margin-bottom: 8px;">{$t.settings.changeUsername || 'Change Username'}</div>
                                <input type="text" bind:value={accountUsername} class="account-input" />
                            </div>
                            <div class="form-group" style="margin-top: 24px;">
                                <div class="setting-label" style="margin-bottom: 8px;">{$t.settings.updatePassword || 'New Password'}</div>
                                <input type="password" bind:value={accountPassword} placeholder="..." class="account-input" />
                            </div>
                            <div class="form-group" style="margin-top: 16px;">
                                <div class="setting-label" style="margin-bottom: 8px;">{$t.settings.confirmPassword || 'Confirm Password'}</div>
                                <input type="password" bind:value={confirmPassword} placeholder="..." class="account-input" />
                            </div>
                            {#if accountError}
                                <p class="error-msg">{accountError}</p>
                            {/if}
                            {#if accountSuccess}
                                <p class="status-msg">{$t.settings.accountUpdated || 'Profile updated successfully'}</p>
                            {/if}
                            <div class="account-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px; align-items: center;">
                                <button class="btn-primary" on:click={handleUpdateProfile}>{$t.common.save}</button>
                            </div>

                            <div class="group-header" style="margin-top: 48px; margin-bottom: 12px;">
                                <h3 class="section-title">{$t.settings.dangerZone || 'Danger Zone'}</h3>
                            </div>
                            <div class="form-group danger-zone">
                                <p class="warning-text">{$t.settings.deleteAccountDesc || 'This action is permanent and cannot be undone.'}</p>
                                <button class="btn-delete" on:click={handleDeleteAccount}>
                                    {$t.settings.deleteAccountBtn || 'Delete Account'}
                                </button>
                            </div>
                            
                        {:else}
                            <p>{$t.settings.notLoggedIn}</p>
                        {/if}
                    </div>
                {:else}
                    {#if activeTab === 'preferences'}
                        <div class="preferences-container">
                            <div id="sec-lang" class="setting-group">
                                <div class="form-group">
                                    <h3 class="section-title" style="margin-bottom: 12px;">{$t.settings.language}</h3>
                                    <DropdownSelect
                                        id="set-lang"
                                        customClass="settings-select"
                                        value={$locale}
                                        on:change={changeLanguage}
                                        options={[
                                            { value: 'en', label: 'English' },
                                            { value: 'es', label: 'Español' }
                                        ]}
                                    />
                                </div>
                            </div>

                            <div id="sec-theme" class="setting-group">
                                <div class="form-group">
                                    <h3 class="section-title" style="margin-bottom: 12px;">{$t.settings.theme}</h3>
                                    <div class="theme-grid">
                                        {#each Object.entries(appThemes) as [key, theme]}
                                            <button 
                                                class="theme-card" 
                                                class:selected={$activeTheme === key}
                                                on:click={() => activeTheme.set(key)}
                                                style="--preview-color: {theme.primary}"
                                            >
                                                <div class="color-preview"></div>
                                                <span>{
                                                    key === 'sky' ? $t.settings.themeSky :
                                                    key === 'emerald' ? $t.settings.themeEmerald :
                                                    key === 'amethyst' ? $t.settings.themeAmethyst :
                                                    key === 'slate' ? $t.settings.themeSlate :
                                                    key === 'teal' ? $t.settings.themeTeal :
                                                    key === 'amber' ? $t.settings.themeAmber : theme.name
                                                }</span>
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            </div>

                            <div id="sec-zoom" class="setting-group" style="padding-bottom: 1rem;">
                                <div class="form-group">
                                    <h3 class="section-title" style="margin-bottom: 12px;">{$t.settings.zoomLevel} ({$zoomLevel}%)</h3>
                                    <input 
                                        type="range" 
                                        min="50" max="200" step="5" 
                                        bind:value={$zoomLevel}
                                        class="zoom-slider"
                                    />
                                    <div class="zoom-hints" style="position: relative; height: 16px; width: 100%;">
                                        <span style="position: absolute; left: 0%;">50%</span>
                                        <span style="position: absolute; left: 33.33%; transform: translateX(-50%);">100%</span>
                                        <span style="position: absolute; right: 0%;">200%</span>
                                    </div>
                                </div>
                            </div>

                            <div id="sec-dateformat" class="setting-group" style="padding-bottom: 1rem;">
                                <div class="form-group">
                                    <h3 class="section-title" style="margin-bottom: 12px;">{$t.settings.dateFormat || 'Date Format'}</h3>
                                    <DropdownSelect
                                        id="set-dateformat"
                                        customClass="settings-select dateformat-select"
                                        value={$activeDateFormat}
                                        on:change={(e) => activeDateFormat.set(e.detail.value)}
                                        options={[
                                            { value: 'dd/mm/yyyy hh:mm:ss', label: $t.settings.dateFormats?.dd_mm_yyyy_hh_mm_ss || 'DD/MM/YYYY HH:MM:SS' },
                                            { value: 'dd/mm/yyyy', label: $t.settings.dateFormats?.dd_mm_yyyy || 'DD/MM/YYYY' },
                                            { value: 'mm/dd/yyyy hh:mm:ss', label: $t.settings.dateFormats?.mm_dd_yyyy_hh_mm_ss || 'MM/DD/YYYY HH:MM:SS' },
                                            { value: 'mm/dd/yyyy', label: $t.settings.dateFormats?.mm_dd_yyyy || 'MM/DD/YYYY' },
                                            { value: 'yyyy-mm-dd hh:mm:ss', label: $t.settings.dateFormats?.yyyy_mm_dd_hh_mm_ss || 'YYYY-MM-DD HH:MM:SS' },
                                            { value: 'yyyy-mm-dd', label: $t.settings.dateFormats?.yyyy_mm_dd || 'YYYY-MM-DD' }
                                        ]}
                                    />
                                    {#if $t.settings.dateFormatHint && $activeDateFormat.includes('hh:mm:ss')}
                                        <p class="setting-hint">{$t.settings.dateFormatHint}</p>
                                    {/if}
                                </div>
                            </div>

                            <div id="sec-autocomplete" class="setting-group" style="padding-bottom: 1rem;">
                                <div class="form-group">
                                    <h3 class="section-title" style="margin-bottom: 12px;">{$t.settings.autocompleteSuggestions}</h3>
                                    <DropdownSelect
                                        id="set-autocomplete"
                                        customClass="settings-select"
                                        value={($autocompleteLimit ?? 10).toString()}
                                        on:change={(e) => autocompleteLimit.set(parseInt(e.detail.value))}
                                        options={[
                                            { value: '0', label: $t.settings.disabled },
                                            { value: '5', label: '5' },
                                            { value: '10', label: '10' },
                                            { value: '25', label: '25' },
                                            { value: '50', label: '50' }
                                        ]}
                                    />
                                </div>
                            </div>

                            <div id="sec-shortcuts" class="setting-group">
                                <div class="group-header">
                                    <h3 class="section-title" style="margin-bottom: 12px;">{$t.settings.keyboardShortcuts}</h3>
                                    <button class="reset-btn" style="margin-left:auto" on:click={() => activeShortcuts.reset()} title={$t.settings.resetToDefaults}>
                                        <RotateCcw size={16} />
                                    </button>
                                </div>
                                <div class="shortcuts-list">
                                    {#each Object.entries($activeShortcuts) as [action, keyCombo]}
                                        <div class="shortcut-item">
                                            <span>{
                                                action === 'newBook' ? $t.menu.addBook :
                                                action === 'editBook' ? $t.menu.editBook :
                                                action === 'search' ? $t.common.search :
                                                action === 'toggleMultiSelect' ? $t.menu.enterMultiSelect :
                                                action === 'deleteSelected' ? $t.common.delete :
                                                action === 'moveBook' ? $t.menu.moveBook :
                                                action === 'settings' ? $t.menu.settings :
                                                action === 'export' ? $t.menu.exportCsv :
                                                action === 'advancedFilter' ? $t.menu.advancedFilter :
                                                action === 'zoomIn' ? $t.menu.zoomIn :
                                                action === 'zoomOut' ? $t.menu.zoomOut :
                                                action === 'zoomReset' ? $t.menu.zoomReset :
                                                action
                                            }</span>
                                            <div 
                                                class="shortcut-btn"
                                                class:capturing={capturingKey === action}
                                                tabindex="0"
                                                role="button"
                                                on:focus={() => capturingKey = action}
                                                on:blur={() => capturingKey = null}
                                                on:keydown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (e.key === 'Escape') {
                                                        e.currentTarget.blur();
                                                        return;
                                                    }
                                                    if (['control', 'shift', 'alt', 'meta', 'altgraph', 'capslock', 'numlock', 'scrolllock'].includes(e.key.toLowerCase())) {
                                                        return;
                                                    }
                                                    const newCombo = [
                                                        e.ctrlKey ? 'ctrl' : '',
                                                        e.altKey ? 'alt' : '',
                                                        e.shiftKey ? 'shift' : '',
                                                        e.key.toLowerCase()
                                                    ].filter(Boolean).join('+');
                                                    
                                                    activeShortcuts.update(sc => ({ ...sc, [action]: newCombo }));
                                                    e.currentTarget.blur();
                                                }}
                                            >
                                                {#if capturingKey === action}
                                                    <span class="capturing-text">{$t.form.capturing}</span>
                                                {:else}
                                                    {#each parseShortcut(keyCombo) as key, i}
                                                        {#if i > 0}<span class="plus-sep">+</span>{/if}
                                                        <kbd class="shortcut-kbd">{key}</kbd>
                                                    {/each}
                                                {/if}
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    {/if}

                    {#if activeTab === 'workspace'}
                        <div class="workspace-wrapper">
                            <ColumnSettings activeTab={initialWorkspaceTab} />
                        </div>
                    {/if}
                {/if}
            </section>
        </div>
    </div>
</div>

{#if showDeleteConfirm}
    <DeleteAccountModal 
        error={deleteError}
        on:confirm={executeDeleteAccount}
        on:cancel={() => { showDeleteConfirm = false; deleteError = ''; }}
    />
{/if}

<style>
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(2px);
    }

    .modal-container {
        background: var(--panel-bg);
        width: 750px;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    .modal-header {
        padding: 16px 24px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-main);
    }

    .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
    }
    .close-btn:hover {
        color: var(--text-main);
    }

    .modal-body {
        display: flex;
        height: 550px;
    }

    .settings-nav {
        width: 250px;
        background-color: var(--bg-color);
        padding: 24px 0;
        display: flex;
        flex-direction: column;
        border-right: 1px solid var(--border-color);
        flex-shrink: 0;
    }

    @media (max-width: 768px) {
        .modal-body {
            flex-direction: column;
            height: auto !important;
            overflow-y: hidden;
        }

        .settings-nav {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
            padding: 0;
            display: flex;
            flex-direction: row;
            justify-content: space-around;
            background-color: var(--panel-bg);
            z-index: 10;
        }

        .settings-content {
            flex: 1 !important;
            padding: 16px 12px !important;
            overflow-y: auto;
            background-color: var(--bg-color);
            overflow-x: hidden;
        }
        
        .workspace-wrapper {
            margin: -16px -12px !important;
        }
        
        .accordion-header {
            flex-direction: column;
            justify-content: center;
            gap: 4px;
            padding: 12px 8px;
            border-right: none !important;
            border-bottom: 2px solid transparent;
            font-size: 11px;
            text-align: center;
            color: var(--text-muted);
            flex: 1;
        }
        .accordion-header :global(svg) {
            margin-bottom: 2px;
            width: 20px;
            height: 20px;
        }
        .accordion-header.active {
            border-bottom: 2px solid var(--primary-color) !important;
            color: var(--primary-color);
            background: transparent;
        }

        /* Hide sub-menus on mobile, users can scroll down */
        .accordion-content {
            display: none !important;
        }

        /* Make settings sections look like premium cards on mobile */
        .setting-group {
            background: var(--panel-bg);
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid var(--border-color);
            margin-bottom: 16px !important;
        }
        
        .section-title {
            font-size: 15px;
            margin-bottom: 16px !important;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 8px;
        }
    }

    .nav-section {
        display: flex;
        flex-direction: column;
    }

    .accordion-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 24px;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        font-weight: 500;
        color: var(--text-main);
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .accordion-header:hover {
        background-color: var(--hover-color);
    }
    .accordion-header.active {
        color: var(--primary-color);
        background-color: var(--hover-color);
        border-right: 3px solid var(--primary-color);
    }

    .accordion-content {
        display: flex;
        flex-direction: column;
        padding-left: 54px;
        background-color: var(--bg-color);
        overflow: hidden;
    }

    .nav-sub-item {
        padding: 8px 16px;
        background: none;
        border: none;
        text-align: left;
        color: var(--text-main);
        opacity: 0.8;
        font-size: 0.9em;
        cursor: pointer;
        transition: color 0.1s ease;
    }
    .nav-sub-item:hover {
        color: var(--primary-color);
        opacity: 1;
    }

    .settings-content {
        flex: 1;
        padding: 32px;
    }
    .settings-content.scroll-pane {
        overflow-y: auto;
        scroll-behavior: smooth;
    }

    .setting-group {
        margin-bottom: 24px;
        scroll-margin-top: 32px;
    }
    .setting-group:last-child {
        margin-bottom: 0;
    }

    .setting-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-main);
        margin-bottom: 2px;
    }

    input {
        padding: 10px 14px;
        border: 1px solid #CBD5E1; /* Slate 300 */
        border-radius: 8px;
        font-size: 14px;
        width: 100%;
        box-sizing: border-box;
        background-color: var(--panel-bg);
        color: var(--text-main);
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); /* Primary color ring */
    }

    .workspace-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 500px;
        margin: -24px;
    }

    .warning-text {
        color: var(--text-muted);
        font-size: 13px;
        margin: 0 0 12px 0;
    }
    .danger-zone {
        padding: 16px;
        border: 1px solid var(--danger-color);
        border-radius: 8px;
        background-color: #FEF2F2;
    }

    .zoom-slider {
        width: 100%;
        margin: 12px 0 8px 0;
        padding: 0;
        border: none;
        background: transparent;
        box-shadow: none;
        cursor: pointer;
        accent-color: var(--primary-color);
    }
    .setting-hint {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 8px;
        line-height: 1.4;
    }
    .zoom-slider:focus {
        box-shadow: none;
    }
    
    .btn-delete {
        background-color: transparent;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 8px 16px;
        color: var(--danger-color);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
        width: fit-content;
    }
    .btn-delete:hover {
        background-color: #FEF2F2;
        border-color: var(--danger-color);
    }
    .btn-primary {
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: background-color 0.2s;
    }
    .btn-primary:hover {
        background-color: var(--primary-hover);
    }
    .account-input {
        width: 100%;
    }
    .status-msg {
        color: #10B981;
        font-size: 13px;
        margin-top: 8px;
    }
    .error-msg {
        color: #EF4444;
        font-size: 13px;
        margin-top: 8px;
    }

    .reset-btn {
        background: var(--button-bg, #ffffff);
        border: 1px solid var(--button-border, #E2E8F0);
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
        background: var(--secondary-color, #F8FAFC);
        border-color: var(--primary-color);
        color: var(--primary-color);
    }

    .theme-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
    }
    .theme-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--bg-color);
        border: 2px solid transparent;
        transition: all 0.2s ease;
        border-radius: 8px;
        cursor: pointer;
    }
    .theme-card.selected { border-color: var(--primary-color); }
    .color-preview { width: 32px; height: 32px; border-radius: 50%; background-color: var(--preview-color); }

    .zoom-hints {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 4px;
    }

    .shortcuts-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 4px;
        background: transparent;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
    }
    .shortcut-item:last-child {
        border-bottom: none;
    }
    .shortcut-btn {
        font-family: monospace;
        cursor: pointer;
        padding: 6px 8px;
        border: 1px solid transparent;
        border-radius: 6px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        background: transparent;
        transition: all 0.2s;
        min-height: 32px;
    }
    .shortcut-btn:hover {
        background: var(--bg-color);
    }
    .shortcut-btn:focus, .shortcut-btn.capturing {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 1px var(--primary-color);
        color: var(--primary-color);
        background-color: var(--bg-color);
        outline: none;
    }
    .shortcut-kbd {
        display: inline-block;
        padding: 2px 6px;
        background: var(--button-bg, #f1f5f9);
        border: 1px solid var(--button-border, #cbd5e1);
        border-radius: 4px;
        font-size: 11px;
        color: var(--text-main);
        font-family: inherit;
        box-shadow: 0 1px 1px rgba(0,0,0,0.05);
    }
    .shortcut-btn.capturing .shortcut-kbd {
        display: none;
    }
    .plus-sep {
        margin: 0 4px;
        color: var(--primary-color);
        font-weight: bold;
    }
    .capturing-text {
        color: var(--primary-color);
        font-weight: 600;
        font-size: 12px;
    }

    .group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .section-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-main);
        margin: 0;
    }

    .preferences-container {
        display: flex;
        flex-direction: column;
        gap: 32px;
    }

    .zoom-slider {
        appearance: none;
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        background: var(--border-color);
        border-radius: 3px;
        outline: none;
        margin: 12px 0;
    }
    .zoom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary-color);
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: background 0.15s ease, transform 0.1s ease;
    }
    .zoom-slider::-webkit-slider-thumb:hover {
        background: var(--primary-hover);
        transform: scale(1.1);
    }
    .zoom-slider::-webkit-slider-thumb:active {
        transform: scale(0.95);
    }

    :global(.dateformat-select .select-button),
    :global(.dateformat-select .select-option) {
        font-size: 11px !important;
        font-weight: 500;
        letter-spacing: 0.5px;
    }
    
    :global(.dateformat-select .select-button),
    :global(.dateformat-select .select-option:not(.selected)) {
        color: var(--text-muted) !important;
    }

    :global(.dateformat-select .select-option.selected) {
        color: #ffffff !important;
    }
</style>
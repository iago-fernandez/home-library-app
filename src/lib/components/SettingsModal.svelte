<script lang="ts">
    import { t, locale, setLocale } from '$lib/i18n';
    import { apiClient } from '$lib/api/client';
    import { authStore } from '$lib/stores/auth';
    import ColumnSettings from './ColumnSettings.svelte';
    import { X, User, Sliders, Layout } from 'lucide-svelte';

    export let onClose: () => void;

    let activeTab: 'account' | 'preferences' | 'workspace' = 'account';
    let username = $authStore.user?.username || '';
    let password = '';
    let confirmPassword = '';
    let isLoading = false;
    let message = '';
    let isError = false;

    async function handleUpdateProfile() {
        isLoading = true;
        message = '';
        try {
            await apiClient.updateProfile({ username });
            message = $t.settings.accountUpdated;
            isError = false;
        } catch (e) {
            message = 'Error updating profile';
            isError = true;
        } finally {
            isLoading = false;
        }
    }

    async function handleUpdatePassword() {
        if (password !== confirmPassword) {
            message = $t.auth.passwordsMismatch;
            isError = true;
            return;
        }
        isLoading = true;
        message = '';
        try {
            await apiClient.updateProfile({ username, password });
            message = $t.settings.accountUpdated;
            password = '';
            confirmPassword = '';
            isError = false;
        } catch (e) {
            message = 'Error updating security key';
            isError = true;
        } finally {
            isLoading = false;
        }
    }

    async function handleDeleteAccount() {
        if (confirm($t.settings.deleteWarning)) {
            try {
                await apiClient.deleteAccount();
                window.location.reload();
            } catch (e) {
                message = 'Failed to delete account';
                isError = true;
            }
        }
    }

    function changeLanguage(event: Event) {
        const target = event.target as HTMLSelectElement;
        setLocale(target.value as 'en' | 'es');
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
                <button class:active={activeTab === 'account'} on:click={() => activeTab = 'account'}>
                    <User size={18} />
                    {$t.settings.accountTab}
                </button>
                <button class:active={activeTab === 'preferences'} on:click={() => activeTab = 'preferences'}>
                    <Sliders size={18} />
                    {$t.settings.preferencesTab}
                </button>
                <button class:active={activeTab === 'workspace'} on:click={() => activeTab = 'workspace'}>
                    <Layout size={18} />
                    {$t.settings.workspaceTab}
                </button>
            </nav>

            <section class="settings-content">
                {#if activeTab === 'account'}
                    <div class="setting-group">
                        <label for="set-username">{$t.settings.changeUsername}</label>
                        <input id="set-username" type="text" bind:value={username} />
                        <button class="save-btn" on:click={handleUpdateProfile} disabled={isLoading}>
                            {$t.common.save}
                        </button>
                    </div>

                    <div class="divider"></div>

                    <div class="setting-group">
                        <label for="set-pass">{$t.settings.updatePassword}</label>
                        <input id="set-pass" type="password" bind:value={password} placeholder="New password" />
                        <input type="password" bind:value={confirmPassword} placeholder="Confirm new password" />
                        <button class="save-btn" on:click={handleUpdatePassword} disabled={isLoading}>
                            {$t.common.save}
                        </button>
                    </div>

                    <div class="divider"></div>

                    <div class="danger-zone">
                        <p>{$t.settings.deleteWarning}</p>
                        <button class="delete-btn" on:click={handleDeleteAccount}>
                            {$t.settings.deleteAccount}
                        </button>
                    </div>

                    {#if message}
                        <p class="status-msg" class:error-msg={isError}>{message}</p>
                    {/if}

                {:else if activeTab === 'preferences'}
                    <div class="setting-group">
                        <label for="set-lang">{$t.settings.language}</label>
                        <select id="set-lang" class="settings-select" on:change={changeLanguage}>
                            <option value="en" selected={$locale === 'en'}>English</option>
                            <option value="es" selected={$locale === 'es'}>Español</option>
                        </select>
                    </div>
                {:else if activeTab === 'workspace'}
                    <div class="workspace-wrapper">
                        <ColumnSettings />
                    </div>
                {/if}
            </section>
        </div>
    </div>
</div>

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
        background: white;
        width: 750px;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    .modal-header {
        padding: 16px 24px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
    }

    .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #666;
    }

    .modal-body {
        display: flex;
        height: 550px;
    }

    .settings-nav {
        width: 200px;
        background: #f8f9fa;
        border-right: 1px solid #eee;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .settings-nav button {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        color: #555;
    }

    .settings-nav button.active {
        background: #e6f7ff;
        color: #0066cc;
        font-weight: 500;
    }

    .settings-content {
        flex: 1;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        overflow-y: auto;
    }

    .setting-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .divider {
        height: 1px;
        background-color: #eee;
        margin: 4px 0;
    }

    label {
        font-size: 13px;
        font-weight: 600;
        color: #444;
    }

    input, .settings-select {
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        width: 100%;
        box-sizing: border-box;
    }

    .save-btn {
        background: #0066cc;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
    }

    .danger-zone {
        background: #fff1f0;
        border: 1px solid #ffa39e;
        padding: 16px;
        border-radius: 6px;
    }

    .danger-zone p {
        margin: 0 0 16px 0;
        font-size: 13px;
        color: #cf1322;
    }

    .delete-btn {
        background: #ff4d4f;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
    }

    .status-msg {
        font-size: 13px;
        color: #52c41a;
        margin: 0;
    }

    .error-msg {
        color: #ff4d4f;
    }

    .workspace-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        margin: -24px; /* Compensate for settings-content padding to let ColumnSettings use the space */
    }
</style>
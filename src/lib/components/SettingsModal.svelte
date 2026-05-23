<script lang="ts">
    import { t, locale, setLocale } from '$lib/i18n';
    import { apiClient } from '$lib/api/client';
    import { authStore } from '$lib/stores/auth';
    import ColumnSettings from './ColumnSettings.svelte';
    import DropdownSelect from './DropdownSelect.svelte';
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

    function changeLanguage(event: { target: { value: string } }) {
        setLocale(event.target.value as 'en' | 'es' | 'gl');
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

            <section class="settings-content" class:no-padding={activeTab === 'workspace'}>
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
                        <DropdownSelect
                            id="set-lang"
                            customClass="settings-select"
                            value={$locale}
                            on:change={(e) => changeLanguage({ target: { value: e.detail.value } })}
                            options={[
                                { value: 'en', label: 'English' },
                                { value: 'es', label: 'Español' }
                            ]}
                        />
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
        width: 220px;
        background: #F8FAFC; /* Slate 50 */
        border-right: 1px solid var(--border-color);
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .settings-nav button {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        color: var(--text-muted);
        transition: all 0.2s ease;
    }

    .settings-nav button:hover {
        background: #E2E8F0; /* Slate 200 */
        color: var(--text-main);
    }

    .settings-nav button.active {
        background: var(--primary-color);
        color: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .settings-content {
        flex: 1;
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        overflow-y: auto;
        background: var(--panel-bg);
    }
    
    .settings-content.no-padding {
        padding: 0;
    }

    .setting-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .divider {
        height: 1px;
        background-color: var(--border-color);
        margin: 8px 0;
    }

    label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-main);
        margin-bottom: 2px;
    }

    input, .settings-select {
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
    input:focus, .settings-select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15); /* Primary color ring */
    }

    .save-btn {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        width: fit-content;
        margin-top: 4px;
        transition: background-color 0.2s, transform 0.1s;
        align-self: flex-end;
    }
    .save-btn:hover:not(:disabled) {
        background: var(--primary-hover);
    }
    .save-btn:active:not(:disabled) {
        transform: scale(0.98);
    }
    .save-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .danger-zone {
        background: #FEF2F2; /* Red 50 */
        border: 1px solid #FECACA; /* Red 200 */
        padding: 20px;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .danger-zone p {
        margin: 0;
        font-size: 13px;
        color: #B91C1C; /* Red 700 */
        line-height: 1.5;
    }

    .delete-btn {
        background: #EF4444; /* Red 500 */
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        width: fit-content;
        transition: background-color 0.2s;
        align-self: flex-end;
    }
    .delete-btn:hover {
        background: #DC2626; /* Red 600 */
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
    }
</style>
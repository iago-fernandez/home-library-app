<script lang="ts">
    import { t } from '$lib/i18n';
    import { apiClient } from '$lib/api/client';
    import { authStore } from '$lib/stores/auth';
    import { X, User, Shield, AlertTriangle } from 'lucide-svelte';

    export let onClose: () => void;

    let activeTab: 'profile' | 'security' | 'danger' = 'profile';
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
                <button class:active={activeTab === 'profile'} on:click={() => activeTab = 'profile'}>
                    <User size={18} />
                    {$t.settings.profileTab}
                </button>
                <button class:active={activeTab === 'security'} on:click={() => activeTab = 'security'}>
                    <Shield size={18} />
                    {$t.settings.securityTab}
                </button>
                <button class:active={activeTab === 'danger'} on:click={() => activeTab = 'danger'} class="danger-tab">
                    <AlertTriangle size={18} />
                    {$t.settings.dangerTab}
                </button>
            </nav>

            <section class="settings-content">
                {#if activeTab === 'profile'}
                    <div class="setting-group">
                        <label for="set-username">{$t.settings.changeUsername}</label>
                        <input id="set-username" type="text" bind:value={username} />
                        <button class="save-btn" on:click={handleUpdateProfile} disabled={isLoading}>
                            {$t.common.save}
                        </button>
                    </div>
                {:else if activeTab === 'security'}
                    <div class="setting-group">
                        <label for="set-pass">{$t.settings.updatePassword}</label>
                        <input id="set-pass" type="password" bind:value={password} placeholder="New password" />
                        <input type="password" bind:value={confirmPassword} placeholder="Confirm new password" />
                        <button class="save-btn" on:click={handleUpdatePassword} disabled={isLoading}>
                            {$t.common.save}
                        </button>
                    </div>
                {:else if activeTab === 'danger'}
                    <div class="danger-zone">
                        <p>{$t.settings.deleteWarning}</p>
                        <button class="delete-btn" on:click={handleDeleteAccount}>
                            {$t.settings.deleteAccount}
                        </button>
                    </div>
                {/if}

                {#if message}
                    <p class="status-msg" class:error-msg={isError}>{message}</p>
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
        width: 600px;
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
        height: 400px;
    }

    .settings-nav {
        width: 180px;
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

    .settings-nav button.danger-tab:hover {
        color: #d32f2f;
    }

    .settings-content {
        flex: 1;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .setting-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    label {
        font-size: 13px;
        font-weight: 600;
        color: #444;
    }

    input {
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
    }

    .save-btn {
        background: #0066cc;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
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
</style>
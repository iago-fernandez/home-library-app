<script lang="ts">
    import '../app.css';
    import { authStore } from '$lib/stores/auth';
    import { apiClient } from '$lib/api/client';
    import { t, locale, setLocale } from '$lib/i18n';

    let username = '';
    let password = '';
    let errorMsg = '';
    let isLoading = false;

    let mouseX = 0;
    let mouseY = 0;

    $: isAuthenticated = !!$authStore.token;

    function handleMouseMove(event: MouseEvent) {
        mouseX = event.clientX;
        mouseY = event.clientY;
    }

    async function handleAuth(e: Event) {
        e.preventDefault();
        if (isLoading) return;

        errorMsg = '';
        isLoading = true;
        try {
            await apiClient.login({ username, password });
        } catch (err: any) {
            errorMsg = $t.auth.loginError;
        } finally {
            isLoading = false;
        }
    }

    function toggleLanguage() {
        setLocale($locale === 'en' ? 'es' : 'en');
    }
</script>

{#if !isAuthenticated}
    <div
            class="gateway-wrapper"
            role="presentation"
            on:mousemove={handleMouseMove}
            style="--mouse-x: {mouseX}px; --mouse-y: {mouseY}px;"
    >
        <button class="lang-toggle" on:click={toggleLanguage}>
            {$locale === 'en' ? 'ES' : 'EN'}
        </button>

        <div class="gateway-container">
            <h1 class="gateway-title">{$t.auth.accessWorkspace}</h1>

            <form on:submit={handleAuth} class="gateway-form">
                <div class="input-group">
                    <label for="username">{$t.auth.profileName}</label>
                    <input
                            id="username"
                            type="text"
                            bind:value={username}
                            required
                            class="gateway-input"
                    />
                </div>

                <div class="input-group">
                    <label for="password">{$t.auth.securityKey}</label>
                    <input
                            id="password"
                            type="password"
                            bind:value={password}
                            required
                            class="gateway-input"
                    />
                </div>

                {#if errorMsg}
                    <div class="gateway-error">{errorMsg}</div>
                {/if}

                <button type="submit" class="gateway-btn" disabled={isLoading}>
                    {isLoading ? $t.auth.processing : $t.auth.loginBtn}
                </button>
            </form>
        </div>
    </div>
{:else}
    <slot />
{/if}

<style>
    .gateway-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: var(--bg-color);
        background-image: radial-gradient(
                circle 800px at var(--mouse-x, 50%) var(--mouse-y, 50%),
                var(--secondary-color) 0%,
                var(--bg-color) 100%
        );
        color: var(--text-main);
        font-family: system-ui, -apple-system, sans-serif;
        transition: background-image 0.2s ease-out;
        position: relative;
    }
    .lang-toggle {
        position: absolute;
        top: 24px;
        right: 24px;
        background: transparent;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
        padding: 6px 12px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .lang-toggle:hover {
        background: var(--bg-color);
        border-color: var(--primary-color);
        color: var(--primary-color);
    }
    .gateway-container {
        width: 100%;
        max-width: 400px;
        padding: 48px;
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
    }
    .gateway-title {
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 32px;
        color: #1a1a1a;
        text-align: center;
        letter-spacing: -0.5px;
    }
    .gateway-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    .input-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    label {
        font-size: 13px;
        font-weight: 500;
        color: #555;
    }
    .gateway-input {
        background: #fbfbfb;
        border: 1px solid #d9d9d9;
        border-radius: 6px;
        color: #333;
        font-size: 15px;
        padding: 12px 16px;
        width: 100%;
        box-sizing: border-box;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    .gateway-input:focus {
        outline: none;
        border-color: var(--input-focus);
        box-shadow: 0 0 0 2px var(--focus-ring);
        background: var(--panel-bg);
    }
    .gateway-btn {
        background-color: var(--primary-color);
        color: #fff;
        font-size: 15px;
        font-weight: 600;
        padding: 14px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        margin-top: 12px;
        transition: background-color 0.2s;
    }
    .gateway-btn:hover:not(:disabled) {
        background-color: var(--primary-hover);
    }
    .gateway-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .gateway-error {
        color: #d32f2f;
        font-size: 13px;
        background-color: #ffebee;
        padding: 10px;
        border-radius: 4px;
        border-left: 3px solid #d32f2f;
    }
    .gateway-toggle {
        width: 100%;
        background: transparent;
        border: none;
        color: #666;
        font-size: 13px;
        margin-top: 24px;
        cursor: pointer;
        transition: color 0.2s;
    }
    .gateway-toggle:hover {
        color: var(--primary-color);
        text-decoration: underline;
    }
</style>
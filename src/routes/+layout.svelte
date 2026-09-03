<script lang="ts">
    import '../app.css';
    import { authStore } from '$lib/stores/auth';
    import { apiClient } from '$lib/api/client';
    import { t, locale, setLocale } from '$lib/i18n';
    import { activeTheme, appThemes } from '$lib/stores/preferences';
    import { Eye, EyeOff, Palette, AlertCircle } from 'lucide-svelte';
    import ConfirmModal from '$lib/components/ConfirmModal.svelte';

    $: currentTheme = appThemes[$activeTheme as keyof typeof appThemes] || appThemes.sky;
    $: faviconDataUri = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(currentTheme.primary)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m16 6 4 14'/><path d='M12 6v14'/><path d='M8 8v12'/><path d='M4 4v16'/></svg>`;

    $: if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--primary-color', currentTheme.primary);
        document.documentElement.style.setProperty('--primary-hover', currentTheme.hover);
        document.documentElement.style.setProperty('--secondary-color', currentTheme.secondary);
        document.documentElement.style.setProperty('--topbar-bg', currentTheme.topbarBg);
        document.documentElement.style.setProperty('--topbar-border', currentTheme.topbarBorder);
    }

    let username = '';
    let password = '';
    let errorMsg = '';
    let isLoading = false;
    let showPassword = false;
    let showThemeMenu = false;

    let mouseX = 0;
    let mouseY = 0;

    $: isAuthenticated = !!$authStore.token;

    let prevAuthenticated = false;
    $: {
        const currentlyAuth = !!$authStore.token;
        if (prevAuthenticated && !currentlyAuth) {
            username = '';
            password = '';
        }
        prevAuthenticated = currentlyAuth;
    }

    function handleWindowClick(event: MouseEvent) {
        if (showThemeMenu) {
            const target = event.target as HTMLElement;
            if (!target.closest('.theme-selector-container')) {
                showThemeMenu = false;
            }
        }
    }

    function handleMouseMove(event: MouseEvent) {
        mouseX = event.clientX;
        mouseY = event.clientY;
    }

    async function handleAuth(e: Event) {
        e.preventDefault();
        if (isLoading) return;

        if (!username.trim() || !password) {
            errorMsg = $t.auth.emptyFields;
            return;
        }

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

    // Set theme to user preference initially if not logged in
    $: if (typeof window !== 'undefined' && !isAuthenticated) {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && $activeTheme === 'sky') {
            // Optional: Auto detect dark mode if they haven't explicitly chosen a theme yet?
            // Actually, just let them choose.
        }
    }
</script>

<svelte:window on:click={handleWindowClick} />

<svelte:head>
    <title>{$t.appTitle}</title>
    <link rel="icon" type="image/svg+xml" href={faviconDataUri} />
    <link rel="apple-touch-icon" href={faviconDataUri} />
</svelte:head>

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

        <div class="theme-selector-container">
            <button class="theme-toggle" aria-label="Toggle Theme Menu" on:click|stopPropagation={() => showThemeMenu = !showThemeMenu}>
                <Palette size={16} />
            </button>
            {#if showThemeMenu}
                <div class="theme-menu">
                    {#each Object.entries(appThemes) as [key, theme]}
                        <button class="theme-menu-item" aria-label="Select {key} theme" class:active={$activeTheme === key} on:click|stopPropagation={() => { activeTheme.set(key); showThemeMenu = false; }}>
                            <div class="color-dot" style="background-color: {theme.primary};"></div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="gateway-container">
            <h1 class="gateway-title">{$t.auth.accessWorkspace}</h1>

            <form class="gateway-form" on:submit|preventDefault={handleAuth} novalidate>
                <div class="input-group">
                    <label for="username">{$t.auth.profileName}</label>
                    <input
                            id="username"
                            type="text"
                            bind:value={username}
                            autocomplete="off"
                            class="gateway-input"
                    />
                </div>

                <div class="input-group">
                    <label for="password">{$t.auth.securityKey}</label>
                    <div style="position: relative;">
                        <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                bind:value={password}
                                autocomplete="current-password"
                                class="gateway-input"
                                style="padding-right: 40px;"
                        />
                        <button 
                            type="button" 
                            class="pwd-toggle-btn" 
                            on:click={() => showPassword = !showPassword}
                            title={$t.settings.togglePassword}
                        >
                            {#if showPassword}
                                <EyeOff size={18} />
                            {:else}
                                <Eye size={18} />
                            {/if}
                        </button>
                    </div>
                </div>

                {#if errorMsg}
                    <div class="gateway-error">
                        <AlertCircle size={18} style="flex-shrink: 0;" />
                        <span>{errorMsg}</span>
                    </div>
                {/if}

                <button type="submit" class="gateway-btn" disabled={isLoading}>
                    {isLoading ? $t.auth.processing : $t.auth.loginBtn}
                </button>
            </form>
        </div>
    </div>
{:else}
    <slot />
    <ConfirmModal />
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
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Arial, sans-serif;
        font-synthesis: none;
        transition: background-image 0.2s ease-out;
        position: relative;
        padding: 20px;
        box-sizing: border-box;
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

    .theme-selector-container {
        position: absolute;
        top: 24px;
        right: 80px;
    }
    .theme-toggle {
        background: transparent;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        color: var(--text-muted);
        padding: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }
    .theme-toggle:hover {
        background: var(--bg-color);
        border-color: var(--primary-color);
        color: var(--primary-color);
    }
    .theme-menu {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: var(--panel-bg);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        padding: 8px;
        gap: 6px;
        z-index: 10;
    }
    .theme-menu-item {
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: 2px solid transparent;
        padding: 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .theme-menu-item:hover {
        background: var(--hover-color);
    }
    .theme-menu-item.active {
        background: var(--hover-color);
        border-color: var(--primary-color);
    }
    .color-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
    }

    .pwd-toggle-btn {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: color 0.2s;
    }
    .pwd-toggle-btn:hover {
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
        color: var(--error-text, #ff4d4f);
        font-size: 14px;
        background-color: rgba(255, 77, 79, 0.05);
        border: 1px solid rgba(255, 77, 79, 0.2);
        padding: 12px 16px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        line-height: 1.4;
    }

    /* Mobile Gateway Adjustments */
    @media (max-width: 768px) {
        .gateway-container {
            padding: 32px 24px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            margin-top: 60px; /* Make space for top-right toggles */
        }
        
        .gateway-title {
            font-size: 22px;
            margin-bottom: 24px;
        }

        .lang-toggle {
            top: 16px;
            right: 16px;
            padding: 8px 12px; /* Bigger hit target */
        }
        
        .theme-selector-container {
            top: 16px;
            right: 76px;
        }

        .theme-toggle {
            padding: 8px; /* Bigger hit target */
        }
    }
</style>
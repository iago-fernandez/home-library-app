<script lang="ts">
    import '../app.css';
    import { authStore } from '$lib/stores/auth';
    import { apiClient } from '$lib/api/client';

    let username = '';
    let password = '';
    let confirmPassword = '';
    let isRegistering = false;
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
        errorMsg = '';

        if (isRegistering && password !== confirmPassword) {
            errorMsg = 'Passwords do not match.';
            return;
        }

        isLoading = true;
        try {
            if (isRegistering) {
                await apiClient.register({ username, password });
            } else {
                await apiClient.login({ username, password });
            }
        } catch (err: any) {
            errorMsg = isRegistering ? 'Failed to create profile. Username may be taken.' : 'Invalid profile credentials.';
        } finally {
            isLoading = false;
        }
    }

    function toggleMode() {
        isRegistering = !isRegistering;
        errorMsg = '';
        password = '';
        confirmPassword = '';
    }
</script>

{#if !isAuthenticated}
    <div
            class="gateway-wrapper"
            role="presentation"
            on:mousemove={handleMouseMove}
            style="--mouse-x: {mouseX}px; --mouse-y: {mouseY}px;"
    >
        <div class="gateway-container">
            <h1 class="gateway-title">{isRegistering ? 'Create Workspace' : 'Access Workspace'}</h1>

            <form on:submit={handleAuth} class="gateway-form">
                <div class="input-group">
                    <label for="username">Profile Name</label>
                    <input
                            id="username"
                            type="text"
                            bind:value={username}
                            required
                            class="gateway-input"
                    />
                </div>

                <div class="input-group">
                    <label for="password">Security Key</label>
                    <input
                            id="password"
                            type="password"
                            bind:value={password}
                            required
                            class="gateway-input"
                    />
                </div>

                {#if isRegistering}
                    <div class="input-group">
                        <label for="confirmPassword">Confirm Security Key</label>
                        <input
                                id="confirmPassword"
                                type="password"
                                bind:value={confirmPassword}
                                required
                                class="gateway-input"
                        />
                    </div>
                {/if}

                {#if errorMsg}
                    <div class="gateway-error">{errorMsg}</div>
                {/if}

                <button type="submit" class="gateway-btn" disabled={isLoading}>
                    {isLoading ? 'Processing...' : (isRegistering ? 'Register' : 'Authenticate')}
                </button>
            </form>

            <button class="gateway-toggle" type="button" on:click={toggleMode}>
                {isRegistering ? 'Return to authentication' : 'Initialize a new profile'}
            </button>
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
        background-color: #f8f9fa;
        background-image: radial-gradient(
                circle 800px at var(--mouse-x, 50%) var(--mouse-y, 50%),
                #e6f7ff 0%,
                #f8f9fa 100%
        );
        color: #333;
        font-family: system-ui, -apple-system, sans-serif;
        transition: background-image 0.2s ease-out;
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
        border-color: #0066cc;
        box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
        background: #ffffff;
    }
    .gateway-btn {
        background-color: #0066cc;
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
        background-color: #0052a3;
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
        color: #0066cc;
        text-decoration: underline;
    }
</style>
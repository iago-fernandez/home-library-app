<script lang="ts">
    import { t } from '$lib/i18n';
    import { CameraOff } from 'lucide-svelte';

    export let src: string | null | undefined;
    export let alt: string = 'Cover';
    export let objectFit: 'cover' | 'contain' = 'cover';

    let hasError = false;
    let isLoaded = false;

    $: finalUrl = getCoverUrl(src);

    $: if (src !== undefined) {
        hasError = false;
        isLoaded = false;
    }

    function getCoverUrl(path: string | null | undefined): string | null {
        if (!path) return null;
        if (path.startsWith('http')) return path;

        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        let baseUrl = import.meta.env.VITE_API_URL || '';

        if (baseUrl.endsWith('/api')) {
            baseUrl = baseUrl.slice(0, -4);
        } else if (baseUrl.endsWith('/api/')) {
            baseUrl = baseUrl.slice(0, -5);
        }

        return `${baseUrl}${cleanPath}`;
    }

    function trackImage(node: HTMLImageElement) {
        const handleLoad = () => {
            isLoaded = true;
            hasError = false;
        };
        const handleError = () => {
            hasError = true;
            isLoaded = true;
        };

        if (node.complete) {
            if (node.naturalWidth === 0) {
                handleError();
            } else {
                handleLoad();
            }
        }

        node.addEventListener('load', handleLoad);
        node.addEventListener('error', handleError);

        return {
            destroy() {
                node.removeEventListener('load', handleLoad);
                node.removeEventListener('error', handleError);
            }
        };
    }
</script>

<div class="cover-container">
    {#if finalUrl && !hasError}
        <img
                use:trackImage
                src={finalUrl}
                {alt}
                loading="lazy"
                class:loaded={isLoaded}
                style="object-fit: {objectFit};"
        />
        {#if !isLoaded}
            <div class="skeleton"></div>
        {/if}
    {:else}
        <div class="fallback">
            <CameraOff size={24} color="#999" strokeWidth={1.5} />
            <span>{$t.grid.noCover}</span>
        </div>
    {/if}
</div>

<style>
    .cover-container {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f5f5f5;
        overflow: hidden;
        position: relative;
    }

    img {
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
    }

    img.loaded {
        opacity: 1;
    }

    .skeleton {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        z-index: 1;
    }

    @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .fallback {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        color: #999;
        z-index: 2;
    }

    .fallback span {
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        text-align: center;
    }
</style>
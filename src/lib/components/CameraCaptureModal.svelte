<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { X, Camera } from 'lucide-svelte';
    import { t } from '$lib/i18n';

    export let isOpen: boolean = false;
    
    const dispatch = createEventDispatcher();
    let videoElement: HTMLVideoElement;
    let canvasElement: HTMLCanvasElement;
    let stream: MediaStream | null = null;
    let isVideoReady = false;

    $: if (isOpen && !stream) {
        startCamera();
    } else if (!isOpen && stream) {
        stopCamera();
    }

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    aspectRatio: { ideal: 0.666 } // Ideal book cover ratio 2:3
                } 
            });
            if (videoElement) {
                videoElement.srcObject = stream;
                videoElement.play();
                videoElement.onloadedmetadata = () => {
                    isVideoReady = true;
                };
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            // Handle error silently, just won't show video
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            isVideoReady = false;
        }
    }

    function takePhoto() {
        if (!videoElement || !canvasElement || !isVideoReady) return;

        const context = canvasElement.getContext('2d');
        if (!context) return;

        // Set canvas dimensions to match video
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        // Draw video frame to canvas
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

        // Convert to blob and then to File
        canvasElement.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `cover_${Date.now()}.jpg`, { type: 'image/jpeg' });
                dispatch('capture', file);
                close();
            }
        }, 'image/jpeg', 0.9);
    }

    function close() {
        isOpen = false;
        dispatch('close');
    }

    onDestroy(() => {
        stopCamera();
    });
</script>

{#if isOpen}
    <div class="modal-backdrop" role="button" tabindex="0" on:click|self={close} on:keydown={(e) => e.key === 'Enter' && close()}>
        <div class="modal-content">
            <div class="modal-header">
                <h3>{$t.form.takePhoto}</h3>
                <button type="button" class="close-btn" on:click={close}>
                    <X size={20} />
                </button>
            </div>
            
            <div class="camera-wrapper">
                <!-- svelte-ignore a11y-media-has-caption -->
                <video bind:this={videoElement} autoplay playsinline></video>
                <canvas bind:this={canvasElement} style="display: none;"></canvas>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn-cancel" on:click={close}>{$t.common.cancel}</button>
                <button type="button" class="btn-capture" on:click={takePhoto} disabled={!isVideoReady}>
                    <Camera size={20} /> {$t.form.takePhoto}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        animation: fadeIn 0.2s ease-out;
    }

    .modal-content {
        background-color: var(--panel-bg);
        border-radius: 8px;
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        overflow: hidden;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
    }

    .modal-header h3 {
        margin: 0;
        font-size: 18px;
        color: var(--text-main);
    }

    .close-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
    }

    .close-btn:hover {
        background-color: var(--bg-color);
        color: var(--danger-color);
    }

    .camera-wrapper {
        position: relative;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 16px;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    video {
        width: 100%;
        height: 100%;
        max-width: 320px;
        max-height: 480px;
        aspect-ratio: 2 / 3;
        object-fit: cover;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 16px 20px;
        border-top: 1px solid var(--border-color);
        gap: 12px;
    }

    .btn-cancel {
        padding: 8px 16px;
        background-color: transparent;
        color: var(--text-main);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
    }

    .btn-cancel:hover {
        background-color: var(--bg-color);
    }

    .btn-capture {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 20px;
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
    }

    .btn-capture:hover:not(:disabled) {
        filter: brightness(1.1);
    }

    .btn-capture:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>

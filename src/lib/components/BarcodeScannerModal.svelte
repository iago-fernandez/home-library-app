<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { Html5Qrcode } from 'html5-qrcode';
    import { X } from 'lucide-svelte';
    import { t } from '$lib/i18n';

    export let isOpen: boolean = false;
    
    const dispatch = createEventDispatcher();
    let scannerId = 'barcode-scanner-container';
    let html5QrCode: Html5Qrcode | null = null;
    let cameraError = '';

    $: if (isOpen && !html5QrCode) {
        cameraError = '';
        setTimeout(startScanner, 100);
    } else if (!isOpen && html5QrCode) {
        stopScanner();
    }

    async function startScanner() {
        try {
            html5QrCode = new Html5Qrcode(scannerId);
            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.0
                },
                (decodedText) => {
                    dispatch('scan', decodedText);
                    close();
                },
                (errorMessage) => {
                    // Ignorar errores de escaneo continuos (ocurre cuando no hay código en pantalla)
                }
            );
        } catch (err) {
            console.error("Camera access error:", err);
            cameraError = 'No se pudo acceder a la cámara. Revisa los permisos del navegador.';
        }
    }

    async function stopScanner() {
        if (html5QrCode) {
            try {
                if (html5QrCode.isScanning) {
                    await html5QrCode.stop();
                }
                html5QrCode.clear();
            } catch (error) {
                console.error("Failed to clear html5Qrcode.", error);
            }
            html5QrCode = null;
        }
    }

    function close() {
        isOpen = false;
        dispatch('close');
    }

    onDestroy(() => {
        stopScanner();
    });
</script>

{#if isOpen}
    <div class="modal-backdrop" role="button" tabindex="0" on:click|self={close} on:keydown={(e) => e.key === 'Enter' && close()}>
        <div class="modal-content">
            <div class="modal-header">
                <h3>{$t.form.scanBarcode}</h3>
                <button type="button" class="close-btn" on:click={close}>
                    <X size={20} />
                </button>
            </div>
            
            <div class="scanner-wrapper">
                <div id={scannerId}></div>
                {#if cameraError}
                    <div class="camera-error">
                        {cameraError}
                    </div>
                {/if}
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn-cancel" on:click={close}>{$t.common.cancel}</button>
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

    .scanner-wrapper {
        position: relative;
        background-color: #000;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 300px;
    }

    .camera-error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--danger-color);
        background: var(--panel-bg);
        padding: 16px;
        border-radius: 8px;
        text-align: center;
        width: 80%;
    }

    .modal-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 16px 20px;
        border-top: 1px solid var(--border-color);
        background: var(--panel-bg);
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

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* Clean up html5-qrcode injected styles */
    :global(#barcode-scanner-container) {
        border: none !important;
        width: 100% !important;
    }
    :global(#barcode-scanner-container video) {
        width: 100% !important;
        max-height: 60vh !important;
        object-fit: cover !important;
    }
</style>

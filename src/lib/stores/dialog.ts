import { writable } from 'svelte/store';

export interface ConfirmDialogOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

interface DialogState extends ConfirmDialogOptions {
    isOpen: boolean;
    resolve: (value: boolean) => void;
}

function createDialogStore() {
    const { subscribe, set } = writable<DialogState>({
        isOpen: false,
        title: '',
        message: '',
        resolve: () => {}
    });

    return {
        subscribe,
        confirm: (options: ConfirmDialogOptions | string): Promise<boolean> => {
            return new Promise((resolve) => {
                const parsedOptions = typeof options === 'string' ? { title: 'Confirm', message: options } : options;
                set({
                    isOpen: true,
                    title: parsedOptions.title,
                    message: parsedOptions.message,
                    confirmText: parsedOptions.confirmText,
                    cancelText: parsedOptions.cancelText,
                    isDanger: parsedOptions.isDanger || false,
                    resolve
                });
            });
        },
        close: (result: boolean) => {
            let res: (value: boolean) => void = () => {};
            subscribe(state => { res = state.resolve; })();
            res(result);
            set({
                isOpen: false,
                title: '',
                message: '',
                resolve: () => {}
            });
        }
    };
}

export const dialogStore = createDialogStore();

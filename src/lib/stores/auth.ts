import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { User } from '../types/auth';

interface AuthState {
    token: string | null;
    user: User | null;
}

const initialState: AuthState = {
    token: browser ? window.localStorage.getItem('jwt_token') : null,
    user: browser ? JSON.parse(window.localStorage.getItem('user_data') || 'null') : null
};

export const authStore = writable<AuthState>(initialState);

authStore.subscribe((value) => {
    if (browser) {
        if (value.token && value.user) {
            window.localStorage.setItem('jwt_token', value.token);
            window.localStorage.setItem('user_data', JSON.stringify(value.user));
        } else {
            window.localStorage.removeItem('jwt_token');
            window.localStorage.removeItem('user_data');
        }
    }
});
export interface Library {
    id: string;
    name: string;
    description: string | null;
    owner_id: string;
    created_at: string;
    updated_at: string;
}

export interface CreateLibraryPayload {
    name: string;
    description?: string;
}

export interface UpdateLibraryPayload {
    name?: string;
    description?: string;
}

export interface LibraryMember {
    library_id: string;
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    created_at: string;
    username: string;
}

export interface ShareLibraryPayload {
    username: string;
    role: 'editor' | 'viewer';
}

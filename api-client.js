// API Client for MONITIXE Frontend
// Handles all API requests to the backend server

const API_BASE_URL = 'http://localhost:3000/api';

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Set auth token
function setAuthToken(token) {
    localStorage.setItem('authToken', token);
}

// Clear auth token
function clearAuthToken() {
    localStorage.removeItem('authToken');
}

// Make API request
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== AUTH API ====================

const AuthAPI = {
    async register(username, email, password, name) {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, name })
        });
        if (data.token) {
            setAuthToken(data.token);
        }
        return data;
    },

    async login(email, password) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.token) {
            setAuthToken(data.token);
        }
        return data;
    },

    logout() {
        clearAuthToken();
    }
};

// ==================== USER API ====================

const UserAPI = {
    async getProfile(userId) {
        return await apiRequest(`/users/${userId}`);
    },

    async updateProfile(userId, name, bio) {
        return await apiRequest(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ name, bio })
        });
    }
};

// ==================== VIDEO API ====================

const VideoAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/videos?${queryString}`);
    },

    async getById(videoId) {
        return await apiRequest(`/videos/${videoId}`);
    },

    async upload(formData) {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/videos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData // Don't set Content-Type for FormData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }
        return data;
    },

    async delete(videoId) {
        return await apiRequest(`/videos/${videoId}`, {
            method: 'DELETE'
        });
    },

    async like(videoId, type = 'like') {
        return await apiRequest(`/videos/${videoId}/like`, {
            method: 'POST',
            body: JSON.stringify({ type })
        });
    }
};

// ==================== PLAYLIST API ====================

const PlaylistAPI = {
    async getAll() {
        return await apiRequest('/playlists');
    },

    async create(name, description) {
        return await apiRequest('/playlists', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });
    },

    async getVideos(playlistId) {
        return await apiRequest(`/playlists/${playlistId}/videos`);
    },

    async addVideo(playlistId, videoId) {
        return await apiRequest(`/playlists/${playlistId}/videos`, {
            method: 'POST',
            body: JSON.stringify({ videoId })
        });
    },

    async removeVideo(playlistId, videoId) {
        return await apiRequest(`/playlists/${playlistId}/videos/${videoId}`, {
            method: 'DELETE'
        });
    },

    async delete(playlistId) {
        return await apiRequest(`/playlists/${playlistId}`, {
            method: 'DELETE'
        });
    }
};

// ==================== SUBSCRIPTION API ====================

const SubscriptionAPI = {
    async getAll() {
        return await apiRequest('/subscriptions');
    },

    async subscribe(channelId) {
        return await apiRequest('/subscriptions', {
            method: 'POST',
            body: JSON.stringify({ channelId })
        });
    },

    async unsubscribe(channelId) {
        return await apiRequest(`/subscriptions/${channelId}`, {
            method: 'DELETE'
        });
    }
};

// ==================== HISTORY API ====================

const HistoryAPI = {
    async getAll() {
        return await apiRequest('/history');
    },

    async add(videoId) {
        return await apiRequest('/history', {
            method: 'POST',
            body: JSON.stringify({ videoId })
        });
    },

    async clear() {
        return await apiRequest('/history', {
            method: 'DELETE'
        });
    }
};

// ==================== COMMENT API ====================

const CommentAPI = {
    async getByVideo(videoId) {
        return await apiRequest(`/videos/${videoId}/comments`);
    },

    async add(videoId, content) {
        return await apiRequest(`/videos/${videoId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
    }
};

// Export all APIs
window.API = {
    Auth: AuthAPI,
    User: UserAPI,
    Video: VideoAPI,
    Playlist: PlaylistAPI,
    Subscription: SubscriptionAPI,
    History: HistoryAPI,
    Comment: CommentAPI
};

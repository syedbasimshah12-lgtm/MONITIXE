// MONITIXE - Main JavaScript with Full Functionality

// Sample video data - now empty, only user-uploaded videos will be displayed
const sampleVideos = [];

// Sample comments - now empty, only user comments will be displayed
const sampleComments = [];

// Enhanced YouTube-style notification system - starts empty, populated by user actions
let notifications = [];

// Load notifications from localStorage
function loadNotificationsFromStorage() {
    const stored = localStorage.getItem('monitixeNotifications');
    if (stored) {
        notifications = JSON.parse(stored);
    }
    updateNotificationBadge();
}

// Save notifications to localStorage
function saveNotificationsToStorage() {
    localStorage.setItem('monitixeNotifications', JSON.stringify(notifications));
    updateNotificationBadge();
}

// Add new notification
function addNotification(type, channel, text, videoId = null, icon = null) {
    const newNotification = {
        id: Date.now(),
        type: type,
        icon: icon || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + channel.toLowerCase(),
        channel: channel,
        text: text,
        videoId: videoId,
        time: Date.now(),
        unread: true
    };
    
    notifications.unshift(newNotification);
    saveNotificationsToStorage();
    
    // Show toast for new notification
    showToast(text, 'success');
}

// Update notification badge count
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    const unreadCount = notifications.filter(n => n.unread).length;
    
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.unread = false;
        saveNotificationsToStorage();
    }
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    notifications.forEach(n => n.unread = false);
    saveNotificationsToStorage();
    loadNotifications();
}

// Delete notification
function deleteNotification(notificationId) {
    notifications = notifications.filter(n => n.id !== notificationId);
    saveNotificationsToStorage();
    loadNotifications();
}

// Format time ago
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    if (seconds < 2592000) return Math.floor(seconds / 604800) + ' weeks ago';
    return Math.floor(seconds / 2592000) + ' months ago';
}

// State management
let currentUser = {
    loggedIn: false,
    name: "",
    username: "",
    email: "",
    password: "",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user"
};

let isUploading = false; // Track upload state
let currentVideoId = 1;
let isSubscribed = false;
let videoLiked = false;
let videoDisliked = false;
let savedVideos = new Set();
let watchLaterVideos = new Set();

// Store for video blob URLs (recreated on page load)
let videoBlobUrls = {};

// IndexedDB for storing video files
let videoDB;

// Initialize IndexedDB for video storage
function initVideoStorage() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MonitixeVideoDB', 1);
        
        request.onerror = () => reject('IndexedDB failed to open');
        
        request.onsuccess = (event) => {
            videoDB = event.target.result;
            resolve(videoDB);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('videos')) {
                db.createObjectStore('videos', { keyPath: 'id' });
            }
        };
    });
}

// Save video file to IndexedDB
function saveVideoFile(videoId, file) {
    return new Promise((resolve, reject) => {
        if (!videoDB) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = videoDB.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        const request = store.put({ id: videoId, file: file });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject('Failed to save video');
    });
}

// Get video file from IndexedDB
function getVideoFile(videoId) {
    return new Promise((resolve, reject) => {
        if (!videoDB) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = videoDB.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const request = store.get(videoId);
        
        request.onsuccess = () => {
            if (request.result && request.result.file) {
                resolve(request.result.file);
            } else {
                reject('Video not found');
            }
        };
        request.onerror = () => reject('Failed to retrieve video');
    });
}

// Create blob URL from stored video file
async function createVideoBlobUrl(videoId) {
    if (videoBlobUrls[videoId]) {
        return videoBlobUrls[videoId];
    }
    
    try {
        const file = await getVideoFile(videoId);
        const blobUrl = URL.createObjectURL(file);
        videoBlobUrls[videoId] = blobUrl;
        return blobUrl;
    } catch (error) {
        console.error('Failed to create blob URL:', error);
        return null;
    }
}

// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const themeToggle = document.getElementById('themeToggle');
const userAvatar = document.getElementById('userAvatar');
const userDropdown = document.getElementById('userDropdown');
const loginBtn = document.getElementById('loginBtn');
const userMenu = document.getElementById('userMenu');
const notificationBtn = document.querySelector('.notification-btn');
const notificationsPanel = document.getElementById('notificationsPanel');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initVideoStorage().then(() => {
        console.log('Video storage initialized');
    }).catch(err => {
        console.error('Failed to initialize video storage:', err);
    });
    initProfiles();
    initNavigation();
    initThemeToggle();
    initUserMenu();
    initVideoPlayer();
    loadContent();
    updateAuthUI();
    createModals();
    
    // Initialize new features
    loadNotificationsFromStorage();
    initializeCategoryFiltering();
});

// ==================== PROFILE MANAGEMENT SYSTEM ====================

function initProfiles() {
    // Check if profiles exist in localStorage
    const profiles = getProfiles();
    
    // Check if there's an active profile
    const activeProfileEmail = localStorage.getItem('activeProfile');
    
    if (activeProfileEmail && profiles[activeProfileEmail]) {
        // Load the active profile
        currentUser = { ...profiles[activeProfileEmail], loggedIn: true };
        navigateToPage('home');
    } else {
        // Show profile selector
        navigateToPage('profiles');
        loadProfileSelector();
    }
}

function getProfiles() {
    const stored = localStorage.getItem('userProfiles');
    return stored ? JSON.parse(stored) : {};
}

function saveProfiles(profiles) {
    localStorage.setItem('userProfiles', JSON.stringify(profiles));
}

function createProfile(email, password, name, username = null) {
    const profiles = getProfiles();
    
    // Check if profile exists
    if (profiles[email]) {
        return { success: false, message: 'Profile already exists' };
    }
    
    // Generate username if not provided
    if (!username) {
        username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    
    // Create new profile
    const newProfile = {
        email: email,
        password: password,
        name: name,
        username: username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        createdAt: new Date().toISOString()
    };
    
    profiles[email] = newProfile;
    saveProfiles(profiles);
    
    return { success: true, profile: newProfile };
}

function deleteProfile(email) {
    const profiles = getProfiles();
    
    if (!profiles[email]) {
        return { success: false, message: 'Profile not found' };
    }
    
    delete profiles[email];
    saveProfiles(profiles);
    
    // If this was the active profile, clear it
    if (localStorage.getItem('activeProfile') === email) {
        localStorage.removeItem('activeProfile');
    }
    
    return { success: true };
}

function switchProfile(email) {
    // Check if uploading
    if (isUploading) {
        showToast("You can't change profiles while uploading something", 'error');
        return false;
    }
    
    const profiles = getProfiles();
    
    if (!profiles[email]) {
        showToast('Profile not found', 'error');
        return false;
    }
    
    // Set as active profile
    currentUser = { ...profiles[email], loggedIn: true };
    localStorage.setItem('activeProfile', email);
    
    // Update UI
    updateAuthUI();
    navigateToPage('home');
    loadContent();
    
    showToast(`Switched to ${currentUser.name}'s profile`, 'success');
    return true;
}

function loadProfileSelector() {
    const container = document.getElementById('profilesGrid');
    if (!container) return;
    
    const profiles = getProfiles();
    const profilesArray = Object.values(profiles);
    
    if (profilesArray.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px;">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <p>No profiles yet. Create your first profile to get started!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = profilesArray.map(profile => `
        <div class="profile-card" data-email="${profile.email}">
            <button class="delete-profile-btn" data-email="${profile.email}" title="Delete profile">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <img src="${profile.avatar}" alt="${profile.name}" class="profile-avatar">
            <h3>${profile.name}</h3>
            <div class="profile-email">${profile.email}</div>
            <div class="profile-password">Password: ${profile.password}</div>
        </div>
    `).join('');
    
    // Add click handlers for profile cards
    container.querySelectorAll('.profile-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-profile-btn')) {
                const email = card.dataset.email;
                switchProfile(email);
            }
        });
    });
    
    // Add click handlers for delete buttons
    container.querySelectorAll('.delete-profile-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const email = btn.dataset.email;
            
            // Get profile data for name
            const profiles = getProfiles();
            const profile = profiles[email];
            const profileName = profile ? profile.name : email;
            
            // Show confirmation modal
            const confirmed = await showConfirmationModal({
                title: 'Delete Profile',
                message: 'Are you sure you want to delete this profile? This will remove all associated data including videos, comments, and settings.',
                itemName: profileName,
                confirmText: 'Delete Profile',
                type: 'profile'
            });
            
            if (confirmed) {
                const result = deleteProfile(email);
                if (result.success) {
                    showToast('Profile deleted successfully', 'success');
                    loadProfileSelector();
                } else {
                    showToast(result.message, 'error');
                }
            }
        });
    });
}

// Add Profile button handler
document.addEventListener('click', (e) => {
    if (e.target.closest('#addProfileBtn')) {
        navigateToPage('signup');
    }
});

// Create modals for share, tip, save, settings
function createModals() {
    const modalsHTML = `
        <!-- Share Modal -->
        <div class="modal" id="shareModal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Share Video</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="share-options">
                        <button class="share-option" data-platform="facebook">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            Facebook
                        </button>
                        <button class="share-option" data-platform="twitter">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                            Twitter
                        </button>
                        <button class="share-option" data-platform="whatsapp">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            WhatsApp
                        </button>
                        <button class="share-option" data-platform="copy">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            Copy Link
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tip Modal -->
        <div class="modal" id="tipModal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Send a Tip</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 16px; color: var(--text-secondary);">Support this creator with a tip</p>
                    <div class="tip-amounts">
                        <button class="tip-amount" data-amount="5">$5</button>
                        <button class="tip-amount" data-amount="10">$10</button>
                        <button class="tip-amount" data-amount="25">$25</button>
                        <button class="tip-amount" data-amount="50">$50</button>
                    </div>
                    <div style="margin-top: 16px;">
                        <label>Custom Amount</label>
                        <input type="number" id="customTipAmount" placeholder="Enter amount" style="width: 100%; padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary); margin-top: 8px;">
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" id="sendTipBtn">Send Tip</button>
                </div>
            </div>
        </div>

        <!-- Save Modal -->
        <div class="modal" id="saveModal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Save to Playlist</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="playlist-options">
                        <label class="playlist-option">
                            <input type="checkbox" id="watchLaterCheck">
                            <span>Watch Later</span>
                        </label>
                        <label class="playlist-option">
                            <input type="checkbox">
                            <span>Favorites</span>
                        </label>
                        <label class="playlist-option">
                            <input type="checkbox">
                            <span>Learning Resources</span>
                        </label>
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" id="saveToPlaylistBtn">Save</button>
                </div>
            </div>
        </div>

        <!-- Settings Modal -->
        <div class="modal" id="settingsModal">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Video Settings</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-options">
                        <div class="setting-item">
                            <label>Quality</label>
                            <select id="qualitySelect" style="width: 100%; padding: 8px; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary);">
                                <option value="auto">Auto</option>
                                <option value="1080p">1080p</option>
                                <option value="720p">720p</option>
                                <option value="480p">480p</option>
                                <option value="360p">360p</option>
                            </select>
                        </div>
                        <div class="setting-item" style="margin-top: 16px;">
                            <label>Playback Speed</label>
                            <select id="speedSelect" style="width: 100%; padding: 8px; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 8px; color: var(--text-primary);">
                                <option value="0.25">0.25x</option>
                                <option value="0.5">0.5x</option>
                                <option value="0.75">0.75x</option>
                                <option value="1" selected>Normal</option>
                                <option value="1.25">1.25x</option>
                                <option value="1.5">1.5x</option>
                                <option value="1.75">1.75x</option>
                                <option value="2">2x</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalsHTML);
    initModals();
}

// Initialize modals
function initModals() {
    // Close modal handlers
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });

    // Share functionality
    document.querySelectorAll('.share-option').forEach(btn => {
        btn.addEventListener('click', function() {
            const platform = this.dataset.platform;
            const videoUrl = window.location.href;
            const videoTitle = document.getElementById('watchTitle')?.textContent || 'Check out this video on MONITIXE';

            if (platform === 'copy') {
                navigator.clipboard.writeText(videoUrl);
                showToast('Link copied to clipboard!', 'success');
                closeModal('shareModal');
            } else if (platform === 'facebook') {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}`, '_blank');
            } else if (platform === 'twitter') {
                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(videoUrl)}&text=${encodeURIComponent(videoTitle)}`, '_blank');
            } else if (platform === 'whatsapp') {
                window.open(`https://wa.me/?text=${encodeURIComponent(videoTitle + ' ' + videoUrl)}`, '_blank');
            }
        });
    });

    // Tip functionality
    document.querySelectorAll('.tip-amount').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tip-amount').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('customTipAmount').value = '';
        });
    });

    document.getElementById('sendTipBtn')?.addEventListener('click', () => {
        const selectedAmount = document.querySelector('.tip-amount.selected');
        const customAmount = document.getElementById('customTipAmount').value;
        const amount = customAmount || selectedAmount?.dataset.amount;

        if (amount) {
            showToast(`Tip of $${amount} sent successfully! Thank you for supporting the creator.`, 'success');
            closeModal('tipModal');
        } else {
            showToast('Please select or enter an amount', 'error');
        }
    });

    // Save to playlist
    document.getElementById('saveToPlaylistBtn')?.addEventListener('click', () => {
        const watchLater = document.getElementById('watchLaterCheck').checked;
        if (watchLater) {
            watchLaterVideos.add(currentVideoId);
            savedVideos.add(currentVideoId);
        }
        showToast('Video saved to playlist!', 'success');
        closeModal('saveModal');
    });

    // Settings - Speed control
    document.getElementById('speedSelect')?.addEventListener('change', function() {
        const video = document.getElementById('mainVideo');
        if (video) {
            video.playbackRate = parseFloat(this.value);
            showToast(`Playback speed: ${this.value}x`, 'success');
        }
    });

    document.getElementById('qualitySelect')?.addEventListener('change', function() {
        showToast(`Quality set to ${this.value}`, 'success');
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Navigation
function initNavigation() {
    // Page navigation
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateToPage(page);
        });
    });

    // Sidebar toggle
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    });

    // Mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });
}

function navigateToPage(pageName) {
    // Remove mobile optimizations when leaving reels page
    const currentPage = document.querySelector('.page.active');
    if (currentPage && currentPage.id === 'page-reels' && pageName !== 'reels') {
        if (typeof removeMobileOptimizations === 'function') {
            removeMobileOptimizations();
        }
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    }

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    // Load page-specific content
    if (pageName === 'watch') {
        loadWatchPage(currentVideoId);
    } else if (pageName === 'home') {
        // Reload home page with fresh cross-profile videos
        loadCrossProfileVideos('recommendedVideos');
        loadCrossProfileVideos('trendingVideos');
    } else if (pageName === 'explore') {
        // Reload explore page with fresh cross-profile videos
        loadCrossProfileVideos('exploreVideos');
    } else if (pageName === 'channel' && currentUser.loggedIn) {
        updateChannelPage();
    } else if (pageName === 'studio') {
        setTimeout(loadStudioPage, 100);
    } else if (pageName === 'subscriptions') {
        setTimeout(loadSubscriptionsPageContent, 100);
    } else if (pageName === 'reels') {
        setTimeout(loadReelsPage, 100);
    } else if (pageName === 'upload-reel') {
        setTimeout(initReelUpload, 100);
    }
}

// Theme toggle
function initThemeToggle() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`, 'success');
    });
}

// User menu
function initUserMenu() {
    userAvatar?.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!userMenu?.contains(e.target)) {
            userDropdown?.classList.remove('active');
        }
    });

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Check if uploading
        if (isUploading) {
            showToast("You can't change profiles while uploading something", 'error');
            return;
        }
        
        // Clear active profile and go to profile selector
        localStorage.removeItem('activeProfile');
        currentUser.loggedIn = false;
        updateAuthUI();
        navigateToPage('profiles');
        loadProfileSelector();
        showToast('Switched to profile selector', 'success');
    });

    loginBtn?.addEventListener('click', () => {
        navigateToPage('login');
    });

    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        if (email && password) {
            const profiles = getProfiles();
            
            // Check if profile exists
            if (!profiles[email]) {
                showToast('No account found with this email. Please sign up.', 'error');
                return;
            }
            
            // Check password
            if (profiles[email].password !== password) {
                showToast('Incorrect password', 'error');
                return;
            }
            
            // Login successful
            switchProfile(email);
            e.target.reset();
        } else {
            showToast('Please enter email and password', 'error');
        }
    });

    // Enhanced Signup form with validation
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        // Password strength checker
        const passwordInput = signupForm.querySelector('#password');
        const confirmPasswordInput = signupForm.querySelector('#confirmPassword');
        const strengthBar = signupForm.querySelector('.strength-bar-fill');
        const strengthValue = signupForm.querySelector('.strength-value');
        
        // Password visibility toggles
        const passwordToggles = signupForm.querySelectorAll('.password-toggle');
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const input = toggle.previousElementSibling;
                const eyeIcon = toggle.querySelector('.eye-icon');
                const eyeOffIcon = toggle.querySelector('.eye-off-icon');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    eyeIcon.style.display = 'none';
                    eyeOffIcon.style.display = 'block';
                } else {
                    input.type = 'password';
                    eyeIcon.style.display = 'block';
                    eyeOffIcon.style.display = 'none';
                }
            });
        });
        
        // Real-time password strength checking
        if (passwordInput && strengthBar && strengthValue) {
            passwordInput.addEventListener('input', (e) => {
                const password = e.target.value;
                const strength = calculatePasswordStrength(password);
                
                // Remove all classes
                strengthBar.className = 'strength-bar-fill';
                strengthValue.className = 'strength-value';
                
                if (password.length === 0) {
                    strengthValue.textContent = '-';
                } else if (strength.score <= 2) {
                    strengthBar.classList.add('weak');
                    strengthValue.classList.add('weak');
                    strengthValue.textContent = 'Weak';
                } else if (strength.score === 3) {
                    strengthBar.classList.add('medium');
                    strengthValue.classList.add('medium');
                    strengthValue.textContent = 'Medium';
                } else {
                    strengthBar.classList.add('strong');
                    strengthValue.classList.add('strong');
                    strengthValue.textContent = 'Strong';
                }
            });
        }
        
        // Real-time validation for all fields
        const formInputs = signupForm.querySelectorAll('input, select');
        formInputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                if (input.classList.contains('error')) {
                    validateField(input);
                }
            });
        });
        
        // Confirm password matching
        if (confirmPasswordInput && passwordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                const errorSpan = confirmPasswordInput.parentElement.nextElementSibling;
                if (confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value) {
                    confirmPasswordInput.classList.add('error');
                    confirmPasswordInput.classList.remove('success');
                    if (errorSpan && errorSpan.classList.contains('form-error')) {
                        errorSpan.textContent = 'Passwords do not match';
                        errorSpan.classList.add('show');
                    }
                } else if (confirmPasswordInput.value === passwordInput.value && confirmPasswordInput.value.length > 0) {
                    confirmPasswordInput.classList.remove('error');
                    confirmPasswordInput.classList.add('success');
                    if (errorSpan && errorSpan.classList.contains('form-error')) {
                        errorSpan.classList.remove('show');
                    }
                }
            });
        }
        
        // Form submission
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate all fields
            let isValid = true;
            formInputs.forEach(input => {
                if (!validateField(input)) {
                    isValid = false;
                }
            });
            
            if (!isValid) {
                showToast('Please fix all errors before submitting', 'error');
                return;
            }
            
            // Check password match
            if (passwordInput.value !== confirmPasswordInput.value) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            // Get form data
            const formData = {
                firstName: signupForm.querySelector('#firstName').value.trim(),
                lastName: signupForm.querySelector('#lastName').value.trim(),
                username: signupForm.querySelector('#username').value.trim(),
                email: signupForm.querySelector('#email').value.trim(),
                phone: signupForm.querySelector('#phone').value.trim(),
                dateOfBirth: signupForm.querySelector('#dateOfBirth').value,
                gender: signupForm.querySelector('#gender').value,
                password: passwordInput.value,
                marketing: signupForm.querySelector('#marketing').checked
            };
            
            // Show loading state
            const submitBtn = signupForm.querySelector('#signupSubmitBtn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-flex';
            
            try {
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const fullName = `${formData.firstName} ${formData.lastName}`;
                const result = createProfile(formData.email, formData.password, fullName);
                
                if (result.success) {
                    // Store additional user data
                    const profiles = JSON.parse(localStorage.getItem('profiles') || '[]');
                    const profileIndex = profiles.findIndex(p => p.email === formData.email);
                    if (profileIndex !== -1) {
                        profiles[profileIndex] = {
                            ...profiles[profileIndex],
                            username: formData.username,
                            phone: formData.phone,
                            dateOfBirth: formData.dateOfBirth,
                            gender: formData.gender,
                            marketing: formData.marketing,
                            registeredAt: new Date().toISOString()
                        };
                        localStorage.setItem('profiles', JSON.stringify(profiles));
                    }
                    
                    showToast('Account created successfully! Welcome to MONITIXE.', 'success');
                    signupForm.reset();
                    
                    // Reset password strength indicator
                    if (strengthBar && strengthValue) {
                        strengthBar.className = 'strength-bar-fill';
                        strengthValue.className = 'strength-value';
                        strengthValue.textContent = '-';
                    }
                    
                    // Switch to the new profile
                    setTimeout(() => {
                        switchProfile(formData.email);
                    }, 500);
                } else {
                    showToast(result.message, 'error');
                }
            } catch (error) {
                showToast('An error occurred. Please try again.', 'error');
                console.error('Registration error:', error);
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }
}

// Field validation function
function validateField(input) {
    const errorSpan = input.parentElement.querySelector('.form-error') || 
                      input.parentElement.parentElement.querySelector('.form-error');
    
    // Skip validation for optional fields that are empty
    if (!input.required && !input.value) {
        input.classList.remove('error', 'success');
        if (errorSpan) errorSpan.classList.remove('show');
        return true;
    }
    
    let isValid = true;
    let errorMessage = '';
    
    // Check if field is empty
    if (input.required && !input.value.trim()) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    // Email validation
    else if (input.type === 'email' && input.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    }
    // Username validation
    else if (input.id === 'username' && input.value) {
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(input.value)) {
            isValid = false;
            errorMessage = 'Only letters, numbers, and underscores allowed';
        } else if (input.value.length < 3) {
            isValid = false;
            errorMessage = 'Username must be at least 3 characters';
        } else if (input.value.length > 30) {
            isValid = false;
            errorMessage = 'Username must be less than 30 characters';
        }
    }
    // Phone validation (if provided)
    else if (input.type === 'tel' && input.value) {
        const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
        if (!phoneRegex.test(input.value)) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
        }
    }
    // Date of birth validation
    else if (input.type === 'date' && input.value) {
        const birthDate = new Date(input.value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 13) {
            isValid = false;
            errorMessage = 'You must be at least 13 years old';
        }
    }
    // Password validation
    else if (input.id === 'password' && input.value) {
        if (input.value.length < 8) {
            isValid = false;
            errorMessage = 'Password must be at least 8 characters';
        }
        const strength = calculatePasswordStrength(input.value);
        if (strength.score < 2) {
            isValid = false;
            errorMessage = 'Password is too weak. Add uppercase, numbers, and special characters';
        }
    }
    // Checkbox validation (terms)
    else if (input.type === 'checkbox' && input.id === 'terms' && !input.checked) {
        isValid = false;
        errorMessage = 'You must accept the terms and conditions';
    }
    // Min length validation
    else if (input.minLength > 0 && input.value.length < input.minLength) {
        isValid = false;
        errorMessage = `Minimum ${input.minLength} characters required`;
    }
    
    // Update UI
    if (isValid) {
        input.classList.remove('error');
        input.classList.add('success');
        if (errorSpan) errorSpan.classList.remove('show');
    } else {
        input.classList.add('error');
        input.classList.remove('success');
        if (errorSpan) {
            errorSpan.textContent = errorMessage;
            errorSpan.classList.add('show');
        }
    }
    
    return isValid;
}

// Password strength calculator
function calculatePasswordStrength(password) {
    let score = 0;
    if (!password) return { score: 0 };
    
    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Has lowercase
    if (/[a-z]/.test(password)) score++;
    
    // Has uppercase
    if (/[A-Z]/.test(password)) score++;
    
    // Has number
    if (/[0-9]/.test(password)) score++;
    
    // Has special character
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    return { score: Math.min(score, 4) };
}

function updateAuthUI() {
    if (currentUser.loggedIn) {
        userMenu.style.display = 'block';
        loginBtn.style.display = 'none';
        
        // Update user avatar and name
        const userAvatarImg = userAvatar?.querySelector('img');
        if (userAvatarImg && currentUser.avatar) {
            userAvatarImg.src = currentUser.avatar;
        }
        
        // Update dropdown user info if exists
        const dropdownAvatar = document.querySelector('#userDropdown .user-info img');
        const dropdownName = document.querySelector('#userDropdown .user-info .user-name');
        const dropdownEmail = document.querySelector('#userDropdown .user-info .user-email');
        
        if (dropdownAvatar && currentUser.avatar) {
            dropdownAvatar.src = currentUser.avatar;
        }
        if (dropdownName && currentUser.name) {
            dropdownName.textContent = currentUser.name;
        }
        if (dropdownEmail && currentUser.email) {
            dropdownEmail.textContent = currentUser.email;
        }
        
    } else {
        userMenu.style.display = 'none';
        loginBtn.style.display = 'flex';
    }
}

// Notifications
notificationBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationsPanel.classList.toggle('active');
    loadNotifications();
});

document.querySelector('.close-panel')?.addEventListener('click', () => {
    notificationsPanel.classList.remove('active');
});

document.addEventListener('click', (e) => {
    if (!notificationsPanel?.contains(e.target) && !notificationBtn?.contains(e.target)) {
        notificationsPanel?.classList.remove('active');
    }
});

// Enhanced YouTube-style notification loading
function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="notifications-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }

    // Group notifications by time
    const today = [];
    const thisWeek = [];
    const older = [];
    
    const now = Date.now();
    notifications.forEach(notif => {
        const age = now - notif.time;
        if (age < 86400000) { // Less than 1 day
            today.push(notif);
        } else if (age < 604800000) { // Less than 1 week
            thisWeek.push(notif);
        } else {
            older.push(notif);
        }
    });

    let html = '';
    
    // Header with mark all as read button
    if (notifications.some(n => n.unread)) {
        html += `
            <div class="notifications-header">
                <button class="mark-all-read-btn" onclick="markAllNotificationsAsRead()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Mark all as read
                </button>
            </div>
        `;
    }
    
    // Today section
    if (today.length > 0) {
        html += '<div class="notification-section-title">Today</div>';
        html += today.map(notif => createNotificationHTML(notif)).join('');
    }
    
    // This week section
    if (thisWeek.length > 0) {
        html += '<div class="notification-section-title">This Week</div>';
        html += thisWeek.map(notif => createNotificationHTML(notif)).join('');
    }
    
    // Older section
    if (older.length > 0) {
        html += '<div class="notification-section-title">Older</div>';
        html += older.map(notif => createNotificationHTML(notif)).join('');
    }
    
    container.innerHTML = html;
    
    // Add click handlers for notifications
    container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.notification-delete-btn')) {
                return; // Delete button has its own handler
            }
            
            const notifId = parseInt(item.dataset.notifId);
            const notification = notifications.find(n => n.id === notifId);
            
            if (notification) {
                markNotificationAsRead(notifId);
                
                // Navigate based on notification type
                if (notification.videoId) {
                    notificationsPanel.classList.remove('active');
                    navigateToPage('watch');
                    loadWatchPage(notification.videoId);
                } else if (notification.type === 'subscribe') {
                    notificationsPanel.classList.remove('active');
                    navigateToPage('channel');
                }
                
                loadNotifications();
            }
        });
    });
}

function createNotificationHTML(notif) {
    const typeIcons = {
        upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
        live: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff0000" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="#ff0000"/></svg>',
        like: '<svg width="16" height="16" viewBox="0 0 24 24" fill="#ff0000" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        comment: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        subscribe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>'
    };
    
    return `
        <div class="notification-item ${notif.unread ? 'unread' : ''}" data-notif-id="${notif.id}">
            <div class="notification-icon-wrapper">
                <img src="${notif.icon}" alt="" class="notification-icon">
                <div class="notification-type-badge">
                    ${typeIcons[notif.type] || ''}
                </div>
            </div>
            <div class="notification-content">
                <p class="notification-text">${notif.text}</p>
                <span class="notification-time">${formatTimeAgo(notif.time)}</span>
            </div>
            ${notif.unread ? '<div class="notification-unread-dot"></div>' : ''}
            <button class="notification-delete-btn" onclick="deleteNotification(${notif.id}); event.stopPropagation();" title="Dismiss">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `;
}

// Video player
function initVideoPlayer() {
    const video = document.getElementById('mainVideo');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const muteBtn = document.getElementById('muteBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const theaterBtn = document.getElementById('theaterBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const player = document.getElementById('videoPlayer');
    const progressBar = document.querySelector('.progress-bar');

    if (!video) return;

    // Play/Pause
    playPauseBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) {
            video.play();
            player.classList.add('playing');
        } else {
            video.pause();
            player.classList.remove('playing');
        }
    });

    video.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            player.classList.add('playing');
        } else {
            video.pause();
            player.classList.remove('playing');
        }
    });

    // Mute/Unmute
    muteBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        player.classList.toggle('muted', video.muted);
    });

    // Fullscreen
    fullscreenBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            if (player.requestFullscreen) {
                player.requestFullscreen();
            } else if (player.webkitRequestFullscreen) {
                player.webkitRequestFullscreen();
            } else if (player.msRequestFullscreen) {
                player.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    // Theater mode
    theaterBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        player.classList.toggle('theater-mode');
        showToast(player.classList.contains('theater-mode') ? 'Theater mode enabled' : 'Theater mode disabled', 'success');
    });

    // Settings
    settingsBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal('settingsModal');
    });

    // Progress update
    video.addEventListener('timeupdate', () => {
        if (video.duration) {
            const percent = (video.currentTime / video.duration) * 100;
            progressFill.style.width = percent + '%';
            currentTimeEl.textContent = formatTime(video.currentTime);
        }
    });

    video.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(video.duration);
    });

    // Seek
    progressBar?.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = percent * video.duration;
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('page-watch').classList.contains('active')) {
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    playPauseBtn?.click();
                    break;
                case 'f':
                    fullscreenBtn?.click();
                    break;
                case 'm':
                    muteBtn?.click();
                    break;
                case 'ArrowLeft':
                    video.currentTime -= 5;
                    break;
                case 'ArrowRight':
                    video.currentTime += 5;
                    break;
            }
        }
    });
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Load content
function loadContent() {
    // Use cross-profile loading for home and explore pages
    loadCrossProfileVideos('recommendedVideos');
    loadCrossProfileVideos('trendingVideos');
    loadCrossProfileVideos('exploreVideos');
    loadVideoGrid('channelVideos', sampleVideos.slice(0, 6));
    loadVideoGrid('historyVideos', sampleVideos.slice(0, 8));
    loadVideoGrid('watchLaterVideos', sampleVideos.slice(0, 4));
    loadVideoGrid('likedVideos', sampleVideos.slice(4, 8));
    loadShorts();
    loadSubscriptions();
    loadPlaylists();
    loadDashboardData();
    loadAdminData();
}

function loadVideoGrid(containerId, videos) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = videos.map(video => createVideoCard(video)).join('');

    // Add click handlers
    container.querySelectorAll('.video-card').forEach((card, index) => {
        card.addEventListener('click', () => {
            currentVideoId = videos[index].id;
            navigateToPage('watch');
        });
    });
}

function createVideoCard(video) {
    // Ensure all required fields have default values
    const safeVideo = {
        id: video.id || 0,
        title: video.title || 'Untitled Video',
        channel: video.channel || 'Unknown Channel',
        channelId: video.channelId || '',
        channelAvatar: video.channelAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        thumbnail: video.thumbnail || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=640',
        duration: video.duration || '0:00',
        views: video.views || '0',
        date: video.date || 'Recently'
    };
    
    return `
        <div class="video-card" data-video-id="${safeVideo.id}" data-channel-id="${safeVideo.channelId}" data-channel-name="${safeVideo.channel}" data-channel-avatar="${safeVideo.channelAvatar}">
            <div class="video-thumbnail">
                <img src="${safeVideo.thumbnail}" alt="${safeVideo.title}">
                <span class="video-duration">${safeVideo.duration}</span>
            </div>
            <div class="video-card-content">
                <div class="channel-avatar clickable-channel" data-channel-id="${safeVideo.channelId}">
                    <img src="${safeVideo.channelAvatar}" alt="${safeVideo.channel}">
                </div>
                <div class="video-info">
                    <h3 class="video-title">${safeVideo.title}</h3>
                    <div class="video-meta">
                        <span class="channel-name clickable-channel" data-channel-id="${safeVideo.channelId}" style="cursor: pointer; color: #aaa;">${safeVideo.channel}</span>
                        <span>•</span>
                        <span>${safeVideo.views} views</span>
                        <span>•</span>
                        <span>${safeVideo.date}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function loadShorts() {
    const container = document.getElementById('shortsContainer');
    if (!container) return;

    const shortsData = [
        { title: "Quick Tech Tip #1", views: "1.2M", thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400" },
        { title: "Gaming Highlight", views: "850K", thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400" },
        { title: "Music Cover", views: "620K", thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400" },
        { title: "Daily Vlog", views: "430K", thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400" }
    ];

    container.innerHTML = shortsData.map(short => `
        <div class="shorts-card">
            <img src="${short.thumbnail}" alt="${short.title}">
            <div class="shorts-info">
                <h3 class="shorts-title">${short.title}</h3>
                <p class="shorts-views">${short.views} views</p>
            </div>
        </div>
    `).join('');
}

async function loadWatchPage(videoId) {
    // Check sampleVideos first, then uploaded videos from localStorage
    let video = sampleVideos.find(v => v.id === videoId);
    
    if (!video) {
        const stored = localStorage.getItem('uploadedVideos');
        if (stored) {
            const uploadedVideos = JSON.parse(stored);
            video = uploadedVideos.find(v => v.id === videoId);
        }
    }
    
    // Fallback to first sample video if not found
    if (!video) {
        video = sampleVideos[0];
    }
    
    // Update video info
    document.getElementById('watchTitle').textContent = video.title;
    document.getElementById('watchViews').textContent = video.views + ' views';
    document.getElementById('watchDate').textContent = video.date;
    document.getElementById('watchChannel').textContent = video.channel;
    
    // Update subscriber count for this channel
    const subscriberCount = getSubscriberCount(video.channelId);
    document.getElementById('watchSubs').textContent = subscriberCount + ' subscribers';
    document.getElementById('likeCount').textContent = formatCount(video.likes);
    
    // Update channel avatar
    const channelAvatar = document.querySelector('.channel-info-bar .channel-avatar-lg');
    if (channelAvatar && video.channelAvatar) {
        channelAvatar.src = video.channelAvatar;
    }
    
    // Make channel name clickable
    const channelNameElem = document.getElementById('watchChannel');
    if (channelNameElem) {
        channelNameElem.style.cursor = 'pointer';
        channelNameElem.onclick = () => {
            viewProfileChannel(video.channelId, video.channel, video.channelAvatar);
        };
    }
    
    // Update subscribe button
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) {
        // Check if viewing own video
        if (video.channelId === currentUser.username) {
            subscribeBtn.style.display = 'none';
        } else {
            subscribeBtn.style.display = 'block';
            const isSubscribed = isSubscribedToChannel(video.channelId);
            subscribeBtn.textContent = isSubscribed ? 'Subscribed' : 'Subscribe';
            subscribeBtn.className = isSubscribed ? 'btn btn-secondary' : 'btn btn-subscribe';
            
            // Update onclick handler
            subscribeBtn.onclick = () => {
                if (isSubscribed) {
                    unsubscribeFromChannel(video.channelId);
                } else {
                    subscribeToChannel(video.channelId, video.channel, video.channelAvatar);
                }
                // Reload watch page to update button
                loadWatchPage(videoId);
            };
        }
    }
    
    // Update video source
    const videoPlayer = document.getElementById('mainVideo');
    if (videoPlayer && video.videoUrl) {
        // Check if video is stored in IndexedDB
        if (video.videoUrl.startsWith('indexed:')) {
            const storedVideoId = parseInt(video.videoUrl.replace('indexed:', ''));
            try {
                const blobUrl = await createVideoBlobUrl(storedVideoId);
                if (blobUrl) {
                    videoPlayer.src = blobUrl;
                } else {
                    // Video not found in IndexedDB
                    console.error('Video not found in IndexedDB');
                    showToast('Video not available', 'error');
                }
            } catch (error) {
                console.error('Failed to load video from IndexedDB:', error);
                showToast('Failed to load video', 'error');
            }
        } else {
            videoPlayer.src = video.videoUrl;
        }
        videoPlayer.poster = video.thumbnail;
        videoPlayer.load();
    }
    
    if (video.description) {
        document.getElementById('videoDescription').innerHTML = `
            <p>${video.description}</p>
            <div class="description-tags">
                <span class="tag">#${video.category}</span>
                <span class="tag">#MONITIXE</span>
                <span class="tag">#Video</span>
            </div>
        `;
    }

    // Load comments
    loadComments();

    // Load suggested videos
    loadSuggestedVideos();

    // Init interactions
    initWatchPageInteractions();
    
    // Update comment input avatar and ensure input is enabled
    const commentAvatar = document.getElementById('commentUserAvatar');
    const commentInput = document.getElementById('commentInputField');
    
    if (commentAvatar && currentUser.loggedIn && currentUser.avatar) {
        commentAvatar.src = currentUser.avatar;
    }
    
    if (commentInput) {
        commentInput.disabled = false;
        commentInput.readOnly = false;
        commentInput.style.pointerEvents = 'auto';
    }
}

function loadComments() {
    const container = document.getElementById('commentsList');
    if (!container) return;

    // Get all comments from localStorage
    const storedComments = localStorage.getItem('videoComments');
    const allComments = storedComments ? JSON.parse(storedComments) : {};
    
    // Get comments for current video
    const videoComments = allComments[currentVideoId] || [];
    
    // Combine with sample comments if no user comments exist
    const commentsToShow = videoComments.length > 0 ? videoComments : sampleComments.map(c => ({
        ...c,
        videoId: currentVideoId,
        id: Date.now() + Math.random()
    }));
    
    // Get current video to check if user is the owner
    let currentVideo = sampleVideos.find(v => v.id === currentVideoId);
    if (!currentVideo) {
        const stored = localStorage.getItem('uploadedVideos');
        if (stored) {
            const uploadedVideos = JSON.parse(stored);
            currentVideo = uploadedVideos.find(v => v.id === currentVideoId);
        }
    }
    
    const isVideoOwner = currentVideo && currentUser.loggedIn && 
                         (currentVideo.channelId === currentUser.username);

    container.innerHTML = commentsToShow.map(comment => `
        <div class="comment" data-comment-id="${comment.id}">
            <img src="${comment.avatar}" alt="${comment.author}">
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-date">${comment.date}</span>
                    ${isVideoOwner ? `
                        <button class="delete-comment-btn" data-comment-id="${comment.id}" title="Delete comment">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                <p class="comment-text">${comment.text}</p>
                <div class="comment-actions">
                    <button><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg> ${comment.likes}</button>
                    <button>Reply</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Update comment count
    const commentCount = document.getElementById('commentCount');
    if (commentCount) {
        commentCount.textContent = formatCount(commentsToShow.length);
    }
}

function postComment(text) {
    if (!currentUser.loggedIn) {
        showToast('Please sign in to comment', 'error');
        return;
    }
    
    if (!text || text.trim() === '') {
        return;
    }
    
    // Get all comments from localStorage
    const storedComments = localStorage.getItem('videoComments');
    const allComments = storedComments ? JSON.parse(storedComments) : {};
    
    // Initialize comments array for this video if it doesn't exist
    if (!allComments[currentVideoId]) {
        allComments[currentVideoId] = [];
    }
    
    // Create new comment
    const newComment = {
        id: Date.now(),
        videoId: currentVideoId,
        author: currentUser.name,
        avatar: currentUser.avatar,
        text: text.trim(),
        date: 'Just now',
        likes: 0
    };
    
    // Add comment to the beginning
    allComments[currentVideoId].unshift(newComment);
    
    // Save back to localStorage
    localStorage.setItem('videoComments', JSON.stringify(allComments));
    
    // Reload comments
    loadComments();
    
    showToast('Comment posted!', 'success');
}

function deleteComment(commentId) {
    if (!currentUser.loggedIn) {
        showToast('Please sign in', 'error');
        return;
    }
    
    // Confirm deletion
    if (!confirm('Delete this comment? This action cannot be undone.')) {
        return;
    }
    
    // Get all comments from localStorage
    const storedComments = localStorage.getItem('videoComments');
    const allComments = storedComments ? JSON.parse(storedComments) : {};
    
    // Get comments for current video
    const videoComments = allComments[currentVideoId] || [];
    
    // Filter out the comment to delete
    allComments[currentVideoId] = videoComments.filter(c => c.id !== commentId);
    
    // Save back to localStorage
    localStorage.setItem('videoComments', JSON.stringify(allComments));
    
    // Reload comments
    loadComments();
    
    showToast('Comment deleted', 'success');
}

function loadSuggestedVideos() {
    const container = document.getElementById('suggestedVideos');
    if (!container) return;

    const suggested = sampleVideos.slice(0, 8);
    container.innerHTML = suggested.map(video => `
        <div class="suggested-video" data-video-id="${video.id}">
            <div class="suggested-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}">
            </div>
            <div class="suggested-info">
                <h3 class="video-title">${video.title}</h3>
                <div class="video-meta">
                    <span>${video.channel}</span>
                    <span>•</span>
                    <span>${video.views} views</span>
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.suggested-video').forEach(item => {
        item.addEventListener('click', () => {
            const videoId = parseInt(item.dataset.videoId);
            currentVideoId = videoId;
            loadWatchPage(videoId);
            window.scrollTo(0, 0);
        });
    });
}

function initWatchPageInteractions() {
    const subscribeBtn = document.getElementById('subscribeBtn');
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');

    // Subscribe button
    subscribeBtn?.addEventListener('click', () => {
        if (!currentUser.loggedIn) {
            showToast('Please sign in to subscribe', 'error');
            return;
        }
        isSubscribed = !isSubscribed;
        subscribeBtn.classList.toggle('subscribed');
        subscribeBtn.textContent = isSubscribed ? 'Subscribed' : 'Subscribe';
        showToast(isSubscribed ? 'Subscribed!' : 'Unsubscribed', 'success');
    });

    // Like button
    likeBtn?.addEventListener('click', () => {
        if (!currentUser.loggedIn) {
            showToast('Please sign in to like videos', 'error');
            return;
        }
        if (videoDisliked) {
            videoDisliked = false;
            dislikeBtn.classList.remove('active');
        }
        videoLiked = !videoLiked;
        likeBtn.classList.toggle('active');
        const count = parseInt(document.getElementById('likeCount').textContent.replace('K', '000'));
        document.getElementById('likeCount').textContent = formatCount(count + (videoLiked ? 1 : -1));
    });

    // Dislike button
    dislikeBtn?.addEventListener('click', () => {
        if (!currentUser.loggedIn) {
            showToast('Please sign in to dislike videos', 'error');
            return;
        }
        if (videoLiked) {
            videoLiked = false;
            likeBtn.classList.remove('active');
            const count = parseInt(document.getElementById('likeCount').textContent.replace('K', '000'));
            document.getElementById('likeCount').textContent = formatCount(count - 1);
        }
        videoDisliked = !videoDisliked;
        dislikeBtn.classList.toggle('active');
    });

    // Share button
    document.querySelectorAll('.action-btn').forEach(btn => {
        const btnText = btn.textContent.trim();
        if (btnText.includes('Share')) {
            btn.addEventListener('click', () => openModal('shareModal'));
        } else if (btnText.includes('Tip')) {
            btn.addEventListener('click', () => {
                if (!currentUser.loggedIn) {
                    showToast('Please sign in to send tips', 'error');
                    return;
                }
                openModal('tipModal');
            });
        } else if (btnText.includes('Save')) {
            btn.addEventListener('click', () => {
                if (!currentUser.loggedIn) {
                    showToast('Please sign in to save videos', 'error');
                    return;
                }
                openSaveModal();
            });
        }
    });
}

function loadSubscriptions() {
    const container = document.getElementById('subscriptionsList');
    if (!container) return;

    const channels = [
        { name: "TechVision", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tech" },
        { name: "GamePro", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gaming" },
        { name: "MusicWave", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=music" }
    ];

    container.innerHTML = channels.map(channel => `
        <div class="video-card">
            <div class="video-thumbnail">
                <img src="https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=640" alt="">
                <span class="video-duration">12:35</span>
            </div>
            <div class="video-card-content">
                <div class="channel-avatar">
                    <img src="${channel.avatar}" alt="${channel.name}">
                </div>
                <div class="video-info">
                    <h3 class="video-title">Latest Upload from ${channel.name}</h3>
                    <div class="video-meta">
                        <span>${channel.name}</span>
                        <span>•</span>
                        <span>1.2M views</span>
                        <span>•</span>
                        <span>2 days ago</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function loadPlaylists() {
    const container = document.getElementById('playlistsGrid');
    if (!container) return;

    const playlists = [
        { name: "Tech Tutorials", count: 24, thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400" },
        { name: "Gaming Highlights", count: 18, thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400" },
        { name: "Music Favorites", count: 32, thumbnail: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400" }
    ];

    container.innerHTML = playlists.map(playlist => `
        <div class="video-card">
            <div class="video-thumbnail">
                <img src="${playlist.thumbnail}" alt="${playlist.name}">
                <span class="video-duration">${playlist.count} videos</span>
            </div>
            <div class="video-card-content">
                <div class="video-info">
                    <h3 class="video-title">${playlist.name}</h3>
                    <div class="video-meta">
                        <span>Playlist</span>
                        <span>•</span>
                        <span>${playlist.count} videos</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function loadDashboardData() {
    const dashboardVideos = document.getElementById('dashboardVideos');
    if (!dashboardVideos) return;

    const videoStats = [
        { title: "Building the Future: AI-Powered Development", views: "1.2M", likes: "45K", comments: "2.3K", revenue: "$458" },
        { title: "Web Development Crash Course", views: "850K", likes: "32K", comments: "1.8K", revenue: "$325" },
        { title: "Latest Tech Review", views: "620K", likes: "28K", comments: "1.2K", revenue: "$287" }
    ];

    dashboardVideos.innerHTML = videoStats.map(video => `
        <tr>
            <td>${video.title}</td>
            <td>${video.views}</td>
            <td>${video.likes}</td>
            <td>${video.comments}</td>
            <td>${video.revenue}</td>
        </tr>
    `).join('');

    // Load tips
    const tipsList = document.getElementById('tipsList');
    if (tipsList) {
        tipsList.innerHTML = `
            <div class="tip-item" style="padding: 12px; border-bottom: 1px solid var(--border-default);">
                <strong>$25.00</strong> from Alex Johnson
                <span style="color: var(--text-secondary); font-size: 12px; display: block;">2 hours ago</span>
            </div>
            <div class="tip-item" style="padding: 12px; border-bottom: 1px solid var(--border-default);">
                <strong>$10.00</strong> from Sarah Chen
                <span style="color: var(--text-secondary); font-size: 12px; display: block;">1 day ago</span>
            </div>
            <div class="tip-item" style="padding: 12px;">
                <strong>$50.00</strong> from Mike Rodriguez
                <span style="color: var(--text-secondary); font-size: 12px; display: block;">2 days ago</span>
            </div>
        `;
    }
}

function loadAdminData() {
    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`admin-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // Load users
    const usersList = document.getElementById('adminUsersList');
    if (usersList) {
        usersList.innerHTML = `
            <tr>
                <td>John Creator</td>
                <td>john@example.com</td>
                <td>Creator</td>
                <td><span class="badge success">Active</span></td>
                <td><button class="btn btn-secondary" style="padding: 4px 12px; height: auto;">Edit</button></td>
            </tr>
            <tr>
                <td>Sarah Chen</td>
                <td>sarah@example.com</td>
                <td>Premium</td>
                <td><span class="badge success">Active</span></td>
                <td><button class="btn btn-secondary" style="padding: 4px 12px; height: auto;">Edit</button></td>
            </tr>
        `.repeat(3);
    }

    // Load content
    const contentList = document.getElementById('adminContentList');
    if (contentList) {
        contentList.innerHTML = sampleVideos.slice(0, 5).map(video => `
            <tr>
                <td>${video.title}</td>
                <td>${video.channel}</td>
                <td>${video.views}</td>
                <td><span class="badge success">Approved</span></td>
                <td><button class="btn btn-secondary" style="padding: 4px 12px; height: auto;">Review</button></td>
            </tr>
        `).join('');
    }

    // Load reports
    const reportsList = document.getElementById('adminReportsList');
    if (reportsList) {
        reportsList.innerHTML = `
            <tr>
                <td>Inappropriate content</td>
                <td>Video</td>
                <td>user@example.com</td>
                <td>2 hours ago</td>
                <td><button class="btn btn-primary" style="padding: 4px 12px; height: auto;">Review</button></td>
            </tr>
        `.repeat(3);
    }
}

// Upload functionality
const uploadDropzone = document.getElementById('uploadDropzone');
const videoFileInput = document.getElementById('videoFileInput');
const uploadForm = document.getElementById('uploadForm');
let currentUploadedVideoUrl = null;
let currentUploadedVideoFile = null; // Store the actual file for IndexedDB
let currentUploadedThumbnail = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=640';
let currentVideoDuration = '0:00';

uploadDropzone?.addEventListener('click', () => {
    videoFileInput?.click();
});

uploadDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadDropzone.style.borderColor = 'var(--primary-500)';
});

uploadDropzone?.addEventListener('dragleave', () => {
    uploadDropzone.style.borderColor = 'var(--border-default)';
});

uploadDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDropzone.style.borderColor = 'var(--border-default)';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        handleVideoUpload(file);
    }
});

videoFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleVideoUpload(file);
    }
});

function handleVideoUpload(file) {
    uploadDropzone.style.display = 'none';
    uploadForm.style.display = 'block';
    
    // Set upload state to true
    isUploading = true;
    
    // Store the file for later saving to IndexedDB
    currentUploadedVideoFile = file;
    
    const previewVideo = document.getElementById('previewVideo');
    currentUploadedVideoUrl = URL.createObjectURL(file);
    previewVideo.src = currentUploadedVideoUrl;
    
    // Get video duration and display aspect ratio when metadata loads
    previewVideo.addEventListener('loadedmetadata', async () => {
        const minutes = Math.floor(previewVideo.duration / 60);
        const seconds = Math.floor(previewVideo.duration % 60);
        currentVideoDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Display aspect ratio (no validation needed)
        const width = previewVideo.videoWidth;
        const height = previewVideo.videoHeight;
        
        if (aspectRatioIndicator) {
            aspectRatioIndicator.textContent = `${width}×${height}`;
            aspectRatioIndicator.className = 'aspect-ratio-indicator';
        }
        
        // All videos are valid (no aspect ratio restriction)
        videoAspectRatioValid = true;
    }, { once: true });
    
    showToast('Video uploaded successfully!', 'success');
}

// Thumbnail selection functionality
document.addEventListener('click', (e) => {
    // Handle preset thumbnail selection
    if (e.target.closest('.thumb-option:not(.custom-thumb)')) {
        const thumbOption = e.target.closest('.thumb-option');
        const img = thumbOption.querySelector('img');
        if (img) {
            // Remove selection from all thumbnails
            document.querySelectorAll('.thumb-option').forEach(opt => opt.classList.remove('selected'));
            thumbOption.classList.add('selected');
            currentUploadedThumbnail = img.src.replace('w=320', 'w=640');
        }
    }
    
    // Handle custom thumbnail upload
    if (e.target.closest('.custom-thumb')) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    currentUploadedThumbnail = ev.target.result;
                    // Update the custom thumb to show the selected image
                    const customThumb = document.querySelector('.custom-thumb');
                    customThumb.innerHTML = `<img src="${ev.target.result}" alt="Custom thumbnail" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
                    // Mark as selected
                    document.querySelectorAll('.thumb-option').forEach(opt => opt.classList.remove('selected'));
                    customThumb.classList.add('selected');
                    showToast('Thumbnail uploaded!', 'success');
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }
});

// Main upload form submit handler - DO NOT add another handler
uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUploadedVideoFile) {
        showToast('Please upload a video first', 'error');
        return;
    }
    
    const title = document.getElementById('videoTitle')?.value || uploadForm.querySelector('input[placeholder*="title"]')?.value || 'Untitled Video';
    const description = document.getElementById('uploadVideoDescription')?.value || uploadForm.querySelector('textarea')?.value || '';
    const category = document.getElementById('videoCategory')?.value || uploadForm.querySelector('select')?.value || 'Vlogs';
    const tags = uploadForm.querySelector('input[placeholder*="tags"]')?.value || '';
    const videoTypeSelect = document.getElementById('videoType');
    const type = videoTypeSelect ? videoTypeSelect.value : 'video';
    
    // Show loading
    showToast('Uploading...', 'info');
    
    try {
        if (type === 'reel') {
            // Upload as REEL - using new REELS system
            const reelId = `reel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log('=== REEL UPLOAD FROM VIDEO FORM ===');
            console.log('Reel ID:', reelId);
            
            // Save the video file to REELS IndexedDB (correct function name)
            await saveReelVideo(reelId, currentUploadedVideoFile);
            console.log('Video saved to IndexedDB');
            
            // Save thumbnail if provided
            let thumbnailUrl = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400';
            if (currentUploadedThumbnail) {
                // Convert base64 to blob for thumbnail
                try {
                    const response = await fetch(currentUploadedThumbnail);
                    const blob = await response.blob();
                    const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
                    await saveReelThumbnail(reelId, file);
                    thumbnailUrl = URL.createObjectURL(file);
                    console.log('Thumbnail saved to IndexedDB');
                } catch (err) {
                    console.log('Thumbnail save error, using default');
                }
            }
            
            // Create reel object (matching new REELS structure)
            const newReel = {
                id: reelId,
                title,
                description,
                channel: currentUser.username,
                channelId: currentUser.email?.split('@')[0] || currentUser.username,
                channelAvatar: currentUser.avatar,
                thumbnail: thumbnailUrl,
                date: new Date().toISOString(),
                views: '0',
                likes: 0,
                comments: [],
                tags: tags ? tags.split(',').map(t => t.trim()) : [],
                uploadedBy: currentUser.email
            };
            
            // Add to new REELS storage
            console.log('Adding REEL to storage:', newReel);
            addReel(newReel);  // Use new function
            console.log('=== REEL UPLOAD COMPLETE ===');
            
            showToast('✓ REEL uploaded successfully!', 'success');
            
            // Reset upload state
            isUploading = false;
            
            // Revoke blob URL
            if (currentUploadedVideoUrl) {
                URL.revokeObjectURL(currentUploadedVideoUrl);
            }
            
            currentUploadedVideoUrl = null;
            currentUploadedVideoFile = null;
            currentVideoDuration = '0:00';
            uploadForm.style.display = 'none';
            uploadDropzone.style.display = 'flex';
            uploadForm.reset();
            
            if (aspectRatioIndicator) {
                aspectRatioIndicator.textContent = '';
            }
            
            // Navigate to REELS page
            setTimeout(() => {
                navigateToPage('reels');
            }, 500);
            
        } else {
            // Upload as regular video
            const videoId = Date.now();
            
            // Save video file to IndexedDB
            await saveVideoFile(videoId, currentUploadedVideoFile);
            
            // Load existing uploaded videos
            const stored = localStorage.getItem('uploadedVideos');
            let uploadedVideos = stored ? JSON.parse(stored) : [];
            
            const newVideo = {
                id: videoId,
                title: title,
                channel: currentUser.name,
                channelId: currentUser.username,
                channelAvatar: currentUser.avatar,
                thumbnail: currentUploadedThumbnail,
                videoUrl: `indexed:${videoId}`,  // Flag to indicate video is in IndexedDB
                views: '1',  // Default 1 view
                date: 'Just now',
                duration: currentVideoDuration,
                category: category,
                likes: 0,
                description: description,
                tags: tags,
                earnings: 10,  // Default $10 earnings
                watchTime: 3600  // Default 1 hour watch time (in seconds)
            };
            
            uploadedVideos.unshift(newVideo);
            localStorage.setItem('uploadedVideos', JSON.stringify(uploadedVideos));
            
            // Add a default comment to the new video
            const videoComments = JSON.parse(localStorage.getItem('videoComments')) || {};
            if (!videoComments[videoId]) {
                videoComments[videoId] = [];
            }
            videoComments[videoId].push({
                id: Date.now(),
                author: 'Welcome Bot',
                avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot',
                text: 'Congratulations on your video upload! 🎉',
                date: 'Just now',
                likes: 0
            });
            localStorage.setItem('videoComments', JSON.stringify(videoComments));
            
            showToast('Video published successfully!', 'success');
            
            // Reset upload state
            isUploading = false;
            
            // Revoke blob URL to free memory
            if (currentUploadedVideoUrl) {
                URL.revokeObjectURL(currentUploadedVideoUrl);
            }
            
            currentUploadedVideoUrl = null;
            currentUploadedVideoFile = null;
            currentUploadedThumbnail = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=640';
            currentVideoDuration = '0:00';
            uploadForm.style.display = 'none';
            uploadDropzone.style.display = 'flex';
            uploadForm.reset();
            
            // Reset custom thumb
            const customThumb = document.querySelector('.custom-thumb');
            if (customThumb) {
                customThumb.innerHTML = `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>Upload</span>
                `;
                customThumb.classList.remove('selected');
            }
            document.querySelectorAll('.thumb-option').forEach(opt => opt.classList.remove('selected'));
            
            setTimeout(() => {
                navigateToPage('channel');
            }, 500);
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Failed to upload. Please try again.', 'error');
        isUploading = false;
    }
});

// Save Draft button
document.getElementById('saveDraftBtn')?.addEventListener('click', () => {
    // Clear upload state and return to upload page
    isUploading = false;
    showToast('Draft saved', 'success');
    // Could implement actual draft saving here
});

// Legal tabs
document.querySelectorAll('.legal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.legal-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.legal-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-content`).classList.remove('hidden');
    });
});

// Category chips with filtering functionality
document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        const category = chip.textContent.trim();
        filterVideosByCategory(category);
    });
});

// Filter videos by category and hashtags
function filterVideosByCategory(category) {
    const recommendedContainer = document.getElementById('recommendedVideos');
    const trendingContainer = document.getElementById('trendingVideos');
    
    if (!recommendedContainer || !trendingContainer) return;
    
    // Get all videos (sample + uploaded)
    const storedVideos = localStorage.getItem('uploadedVideos');
    const uploadedVideos = storedVideos ? JSON.parse(storedVideos) : [];
    const allVideos = [...sampleVideos, ...uploadedVideos];
    
    let filteredVideos = [];
    
    if (category === 'All') {
        // Show all videos
        filteredVideos = allVideos;
        showToast('Showing all videos', 'success');
    } else if (category === 'REELS') {
        // Navigate to REELS page
        navigateToPage('reels');
        return;
    } else {
        // Filter by category or hashtag
        const categoryLower = category.toLowerCase();
        const hashtag = '#' + categoryLower;
        
        filteredVideos = allVideos.filter(video => {
            // Check if video category matches
            if (video.category && video.category.toLowerCase() === categoryLower) {
                return true;
            }
            
            // Check if video description contains the hashtag
            if (video.description && video.description.toLowerCase().includes(hashtag)) {
                return true;
            }
            
            // Check if video title contains the category name
            if (video.title && video.title.toLowerCase().includes(categoryLower)) {
                return true;
            }
            
            return false;
        });
        
        showToast(`Filtering by ${category}${filteredVideos.length > 0 ? ' (' + filteredVideos.length + ' videos)' : ''}`, 'success');
    }
    
    // Display filtered videos
    if (filteredVideos.length === 0) {
        const emptyHTML = `
            <div class="empty-state">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                    <polyline points="17 2 12 7 7 2"/>
                </svg>
                <h3>No videos found</h3>
                <p>No videos found in the ${category} category. Try another category or upload a video with #${category.toLowerCase()} in the description.</p>
            </div>
        `;
        recommendedContainer.innerHTML = emptyHTML;
        trendingContainer.innerHTML = '';
        return;
    }
    
    // Split videos between recommended and trending
    const halfLength = Math.ceil(filteredVideos.length / 2);
    const recommendedVideos = filteredVideos.slice(0, halfLength);
    const trendingVideos = filteredVideos.slice(halfLength);
    
    // Render recommended videos
    recommendedContainer.innerHTML = recommendedVideos.map(video => createVideoCard(video)).join('');
    
    // Render trending videos
    if (trendingVideos.length > 0) {
        trendingContainer.innerHTML = trendingVideos.map(video => createVideoCard(video)).join('');
        document.querySelector('#page-home .video-section:nth-of-type(2) h2').textContent = 
            category === 'All' ? 'Trending Now' : `Trending in ${category}`;
    } else {
        trendingContainer.innerHTML = '';
    }
    
    // Re-attach click handlers
    attachVideoCardHandlers();
}

// Create video card HTML
function createVideoCard(video) {
    return `
        <div class="video-card" data-video-id="${video.id}">
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}">
                <span class="video-duration">${video.duration}</span>
            </div>
            <div class="video-info">
                <img src="${video.channelAvatar}" alt="${video.channel}" class="channel-avatar">
                <div class="video-details">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="video-channel">${video.channel}</p>
                    <p class="video-meta">
                        <span>${video.views} views</span>
                        <span>•</span>
                        <span>${video.date}</span>
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Attach click handlers to video cards
function attachVideoCardHandlers() {
    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => {
            const videoId = parseInt(card.dataset.videoId);
            navigateToPage('watch');
            loadWatchPage(videoId);
        });
    });
}

// Initialize category filtering on page load
function initializeCategoryFiltering() {
    // Load all videos by default
    filterVideosByCategory('All');
}

// Utility functions
function formatCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(0) + 'K';
    }
    return count.toString();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${type === 'success' ? 
                '<polyline points="20 6 9 17 4 12"/>' : 
                '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
            }
        </svg>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Alias for showToast
function showNotification(message) {
    showToast(message, 'success');
}

// ==================== CONFIRMATION MODAL ====================

/**
 * Show confirmation modal for destructive actions
 * @param {Object} options - Configuration options
 * @param {string} options.title - Modal title
 * @param {string} options.message - Main message
 * @param {string} options.itemName - Name of item to delete (optional)
 * @param {string} options.confirmText - Confirm button text (default: "Delete")
 * @param {string} options.type - Type of deletion for tracking (optional)
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function showConfirmationModal(options = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmationModal');
        const overlay = modal.querySelector('.confirmation-overlay');
        const title = document.getElementById('confirmationTitle');
        const message = document.getElementById('confirmationMessage');
        const itemName = document.getElementById('confirmationItemName');
        const confirmBtn = document.getElementById('confirmationConfirmBtn');
        const cancelBtn = document.getElementById('confirmationCancelBtn');
        
        // Set content
        title.textContent = options.title || 'Confirm Deletion';
        message.textContent = options.message || 'Are you sure you want to delete this item?';
        confirmBtn.textContent = options.confirmText || 'Delete';
        
        // Show or hide item name
        if (options.itemName) {
            itemName.textContent = options.itemName;
            itemName.classList.add('show');
        } else {
            itemName.classList.remove('show');
        }
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Handle confirm
        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };
        
        // Handle cancel
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        // Cleanup function
        const cleanup = () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            overlay.removeEventListener('click', handleCancel);
        };
        
        // Add event listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', handleCancel);
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

// Search functionality
document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = e.target.value;
        if (query.trim()) {
            showToast(`Searching for: ${query}`, 'success');
            // Implement actual search functionality
        }
    }
});

// Contact form
document.querySelector('.contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Message sent successfully!', 'success');
    e.target.reset();
});

console.log('%c MONITIXE ', 'background: #0091FF; color: white; font-size: 20px; padding: 10px; border-radius: 5px;');
console.log('Welcome to MONITIXE - Where Content Meets Creativity');
console.log('All features are now fully functional!');


// ==================== CHANNEL TAB NAVIGATION ====================

function initChannelTabs() {
    const tabBtns = document.querySelectorAll('.channel-tabs .tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabName = btn.textContent.trim().toLowerCase();
            showChannelTabContent(tabName);
        });
    });
}

function showChannelTabContent(tabName) {
    const channelPage = document.getElementById('page-channel');
    let contentContainer = document.getElementById('channelTabContent');
    
    // Create container if doesn't exist
    if (!contentContainer) {
        contentContainer = document.createElement('div');
        contentContainer.id = 'channelTabContent';
        const videoGrid = document.getElementById('channelVideos');
        videoGrid.parentNode.insertBefore(contentContainer, videoGrid.nextSibling);
    }
    
    const videoGrid = document.getElementById('channelVideos');
    
    switch(tabName) {
        case 'videos':
            videoGrid.style.display = 'grid';
            contentContainer.innerHTML = '';
            contentContainer.style.display = 'none';
            break;
            
        case 'shorts':
            videoGrid.style.display = 'none';
            contentContainer.style.display = 'block';
            contentContainer.innerHTML = `
                <div class="channel-shorts-grid">
                    ${generateChannelShorts()}
                </div>
            `;
            break;
            
        case 'playlists':
            videoGrid.style.display = 'none';
            contentContainer.style.display = 'block';
            contentContainer.innerHTML = `
                <div class="channel-playlists">
                    <div class="playlist-card" onclick="showNotification('Playing playlist...')">
                        <div class="playlist-thumb" style="background: linear-gradient(135deg, #0091FF, #FF3B30);">
                            <span class="playlist-count">12 videos</span>
                        </div>
                        <h4>Best of 2024</h4>
                        <p>Updated 2 days ago</p>
                    </div>
                    <div class="playlist-card" onclick="showNotification('Playing playlist...')">
                        <div class="playlist-thumb" style="background: linear-gradient(135deg, #FF3B30, #0091FF);">
                            <span class="playlist-count">8 videos</span>
                        </div>
                        <h4>Tutorials</h4>
                        <p>Updated 1 week ago</p>
                    </div>
                    <div class="playlist-card" onclick="showNotification('Playing playlist...')">
                        <div class="playlist-thumb" style="background: linear-gradient(135deg, #9b59b6, #3498db);">
                            <span class="playlist-count">5 videos</span>
                        </div>
                        <h4>Behind the Scenes</h4>
                        <p>Updated 3 days ago</p>
                    </div>
                </div>
            `;
            break;
            
        case 'community':
            videoGrid.style.display = 'none';
            contentContainer.style.display = 'block';
            contentContainer.innerHTML = `
                <div class="community-posts">
                    <div class="community-post">
                        <div class="post-header">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=tech" alt="Avatar" class="post-avatar">
                            <div>
                                <h4>TechVision</h4>
                                <span class="post-date">2 hours ago</span>
                            </div>
                        </div>
                        <p class="post-content">🎉 Big announcement coming tomorrow! Stay tuned for something exciting. What do you think it could be?</p>
                        <div class="post-actions">
                            <button class="post-btn" onclick="showNotification('Liked!')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 1.2K</button>
                            <button class="post-btn" onclick="showNotification('Disliked')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg></button>
                            <button class="post-btn" onclick="showNotification('Comment section')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> 85</button>
                        </div>
                    </div>
                    <div class="community-post">
                        <div class="post-header">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=tech" alt="Avatar" class="post-avatar">
                            <div>
                                <h4>TechVision</h4>
                                <span class="post-date">1 day ago</span>
                            </div>
                        </div>
                        <p class="post-content">Thanks for 1 million subscribers! 🚀 You all are amazing. Drop a comment with your favorite video of ours!</p>
                        <img src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=640" class="post-image" alt="Post image">
                        <div class="post-actions">
                            <button class="post-btn" onclick="showNotification('Liked!')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 8.5K</button>
                            <button class="post-btn" onclick="showNotification('Disliked')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg></button>
                            <button class="post-btn" onclick="showNotification('Comment section')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> 342</button>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'about':
            videoGrid.style.display = 'none';
            contentContainer.style.display = 'block';
            contentContainer.innerHTML = `
                <div class="channel-about">
                    <div class="about-section">
                        <h3>Description</h3>
                        <p>Welcome to TechVision! We create high-quality content about technology, AI, programming, and the future of innovation. Subscribe and join our community of tech enthusiasts!</p>
                    </div>
                    <div class="about-section">
                        <h3>Stats</h3>
                        <div class="about-stats">
                            <div class="stat-item"><strong>1.2M</strong> subscribers</div>
                            <div class="stat-item"><strong>156</strong> videos</div>
                            <div class="stat-item"><strong>45M</strong> total views</div>
                            <div class="stat-item">Joined <strong>Jan 15, 2020</strong></div>
                        </div>
                    </div>
                    <div class="about-section">
                        <h3>Links</h3>
                        <div class="about-links">
                            <a href="#" class="about-link" onclick="showNotification('Opening Twitter...')"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> @TechVision</a>
                            <a href="#" class="about-link" onclick="showNotification('Opening Instagram...')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg> @techvision_official</a>
                            <a href="#" class="about-link" onclick="showNotification('Opening website...')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> techvision.com</a>
                        </div>
                    </div>
                </div>
            `;
            break;
    }
}

function generateChannelShorts() {
    // Sample shorts removed - only user-uploaded shorts will be displayed
    const shorts = [];
    
    return shorts.map((short, i) => `
        <div class="channel-short-card" onclick="showNotification('Playing short: ${short.title}')">
            <div class="short-thumb" style="background: linear-gradient(${45 + i * 30}deg, #0091FF, #FF3B30);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
            <h4>${short.title}</h4>
            <p>${short.views} views</p>
        </div>
    `).join('');
}

// Initialize channel tabs when page loads
document.addEventListener('DOMContentLoaded', initChannelTabs);


// ==================== COMPREHENSIVE FIXES ====================

// Track subscriptions and uploaded videos
let subscribedChannels = [];
let uploadedVideos = [];

// Initialize all fixes
document.addEventListener('DOMContentLoaded', () => {
    initExploreCategoriesClick();
    initSubscriptionSystem();
    initAdminChannelNameEdit();
    updateSidebarSubscriptions();
});

// ==================== EXPLORE CATEGORIES ====================

function initExploreCategoriesClick() {
    const exploreCards = document.querySelectorAll('.explore-card');
    
    exploreCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const category = card.querySelector('span').textContent.trim();
            showCategoryVideos(category);
        });
    });
}

function showCategoryVideos(category) {
    const explorePage = document.getElementById('page-explore');
    
    // Remove existing results
    let resultsContainer = document.getElementById('exploreResults');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'exploreResults';
        resultsContainer.style.marginTop = '24px';
        explorePage.appendChild(resultsContainer);
    }
    
    // Get all available videos (sample + uploaded)
    const storedVideos = localStorage.getItem('uploadedVideos');
    const uploadedVideos = storedVideos ? JSON.parse(storedVideos) : [];
    const publishedVideos = uploadedVideos.filter(v => v.status === 'published');
    const allVideos = [...sampleVideos, ...publishedVideos];
    
    let filteredVideos = [];
    
    // Filter videos based on category with hashtag support
    if (category === 'Trending') {
        // For Trending, show all videos shuffled
        filteredVideos = [...allVideos];
    } else {
        // Three-level filtering: 1. Category field, 2. Hashtags in description, 3. Title keywords
        const hashtag = `#${category.toLowerCase()}`;
        
        filteredVideos = allVideos.filter(video => {
            // Level 1: Direct category match
            if (video.category === category) {
                return true;
            }
            
            // Level 2: Hashtag in description (primary method)
            if (video.description && video.description.toLowerCase().includes(hashtag)) {
                return true;
            }
            
            // Level 3: Category name in title
            if (video.title && video.title.toLowerCase().includes(category.toLowerCase())) {
                return true;
            }
            
            return false;
        });
    }
    
    // Shuffle videos for variety
    filteredVideos = shuffleArray(filteredVideos);
    
    // Build results HTML
    if (filteredVideos.length === 0) {
        // Empty state
        resultsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="color: #fff; margin: 0;">${category} Videos</h2>
            </div>
            <div style="text-align: center; padding: 60px 20px; color: #888;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3 style="color: #fff; margin-bottom: 8px;">No ${category} Videos Found</h3>
                <p>Try exploring other categories or check back later!</p>
            </div>
        `;
    } else {
        // Display filtered videos
        resultsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="color: #fff; margin: 0;">${category} Videos (${filteredVideos.length})</h2>
                <button class="btn btn-secondary" onclick="showCategoryVideos('${category}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="m20.49 15 a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    Shuffle
                </button>
            </div>
            <div class="video-grid">
                ${filteredVideos.map(video => createVideoCardHTML(video)).join('')}
            </div>
        `;
        
        // Reinitialize video card clicks
        resultsContainer.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', () => {
                const videoId = card.dataset.videoId;
                if (videoId) {
                    showPage('watch');
                    loadVideo(parseInt(videoId));
                }
            });
        });
    }
    
    // Show notification with video count
    if (filteredVideos.length > 0) {
        showNotification(`Found ${filteredVideos.length} ${category} video${filteredVideos.length !== 1 ? 's' : ''}`);
    } else {
        showNotification(`No ${category} videos found`);
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function createVideoCardHTML(video) {
    return `
        <div class="video-card" data-video-id="${video.id}">
            <div class="thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}">
                <span class="duration">${video.duration}</span>
                <button class="add-to-playlist-btn" data-video-id="${video.id}" title="Add to playlist">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>
                    </svg>
                </button>
            </div>
            <div class="video-info">
                <img src="${video.channelAvatar}" alt="${video.channel}" class="channel-avatar">
                <div class="video-details">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="channel-name">${video.channel}</p>
                    <p class="video-meta">${video.views} views • ${video.date}</p>
                </div>
            </div>
        </div>
    `;
}

// ==================== SUBSCRIPTION SYSTEM ====================

function initSubscriptionSystem() {
    // Override subscribe button functionality
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-subscribe')) {
            const btn = e.target.closest('.btn-subscribe');
            const channelPage = document.getElementById('page-channel');
            
            if (channelPage && channelPage.classList.contains('active')) {
                // Get channel info from the page
                const channelName = document.querySelector('#page-channel .channel-info h1').textContent;
                const channelAvatar = document.querySelector('#page-channel .channel-avatar-xl').src;
                
                toggleSubscription(channelName, channelAvatar, btn);
            } else {
                // For watch page subscribe
                const channelName = document.querySelector('.channel-info-bar h4')?.textContent;
                const channelAvatar = document.querySelector('.channel-info-bar .channel-avatar')?.src;
                
                if (channelName) {
                    toggleSubscription(channelName, channelAvatar, btn);
                }
            }
        }
    });
}

function toggleSubscription(channelName, channelAvatar, btn) {
    const existingIndex = subscribedChannels.findIndex(c => c.name === channelName);
    
    if (existingIndex >= 0) {
        // Unsubscribe
        subscribedChannels.splice(existingIndex, 1);
        btn.textContent = 'Subscribe';
        btn.classList.remove('subscribed');
        showNotification(`Unsubscribed from ${channelName}`);
    } else {
        // Subscribe
        subscribedChannels.push({
            name: channelName,
            avatar: channelAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channelName}`
        });
        btn.textContent = 'Subscribed';
        btn.classList.add('subscribed');
        showNotification(`Subscribed to ${channelName}`);
    }
    
    // Save to localStorage FIRST, then update the sidebar
    localStorage.setItem('subscribedChannels', JSON.stringify(subscribedChannels));
    updateSidebarSubscriptions();
}

function updateSidebarSubscriptions() {
    // Load from localStorage
    const stored = localStorage.getItem('subscribedChannels');
    if (stored) {
        subscribedChannels = JSON.parse(stored);
    }
    
    // Find subscription section in sidebar
    const sectionTitle = document.querySelector('.nav-section-title');
    if (!sectionTitle || sectionTitle.textContent.trim() !== 'Subscriptions') return;
    
    // Remove existing subscription items
    let nextEl = sectionTitle.nextElementSibling;
    while (nextEl && nextEl.classList.contains('channel-item')) {
        const toRemove = nextEl;
        nextEl = nextEl.nextElementSibling;
        toRemove.remove();
    }
    
    // Remove existing "Show More" button
    const existingShowMore = document.getElementById('showMoreSubs');
    if (existingShowMore) existingShowMore.remove();
    
    // Add subscribed channels (show first 3)
    const displayCount = Math.min(3, subscribedChannels.length);
    
    for (let i = 0; i < displayCount; i++) {
        const channel = subscribedChannels[i];
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'nav-item channel-item';
        item.innerHTML = `
            <img src="${channel.avatar}" alt="${channel.name}">
            <span>${channel.name}</span>
        `;
        item.addEventListener('click', (e) => {
            e.preventDefault();
            viewSubscribedChannel(channel);
        });
        sectionTitle.parentNode.insertBefore(item, nextEl);
    }
    
    // Add "Show More" if there are more than 3 subscriptions
    if (subscribedChannels.length > 3) {
        const showMoreBtn = document.createElement('a');
        showMoreBtn.href = '#';
        showMoreBtn.id = 'showMoreSubs';
        showMoreBtn.className = 'nav-item';
        showMoreBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            <span>Show ${subscribedChannels.length - 3} more</span>
        `;
        showMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAllSubscriptions();
        });
        sectionTitle.parentNode.insertBefore(showMoreBtn, nextEl);
    }
    
    // If no subscriptions, show placeholder
    if (subscribedChannels.length === 0) {
        const placeholder = document.createElement('p');
        placeholder.className = 'nav-item channel-item';
        placeholder.style.color = '#888';
        placeholder.style.fontSize = '13px';
        placeholder.textContent = 'No subscriptions yet';
        sectionTitle.parentNode.insertBefore(placeholder, nextEl);
    }
}

function showAllSubscriptions() {
    showPage('subscriptions');
    
    const container = document.getElementById('subscriptionsList');
    if (!container) return;
    
    if (subscribedChannels.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 40px;">You haven\'t subscribed to any channels yet.</p>';
        return;
    }
    
    container.innerHTML = subscribedChannels.map(channel => `
        <div class="subscription-item" style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #1a1a1a; border-radius: 12px; margin-bottom: 12px; cursor: pointer;">
            <img src="${channel.avatar}" alt="${channel.name}" style="width: 60px; height: 60px; border-radius: 50%;">
            <div style="flex: 1;">
                <h3 style="color: #fff; margin-bottom: 4px;">${channel.name}</h3>
                <p style="color: #888; font-size: 13px;">Subscribed</p>
            </div>
            <button class="btn btn-secondary" onclick="event.stopPropagation(); unsubscribeFromList('${channel.name}')">Unsubscribe</button>
        </div>
    `).join('');
    
    // Add click events to view channels
    container.querySelectorAll('.subscription-item').forEach((item, i) => {
        item.addEventListener('click', () => {
            viewSubscribedChannel(subscribedChannels[i]);
        });
    });
}

function unsubscribeFromList(channelName) {
    subscribedChannels = subscribedChannels.filter(c => c.name !== channelName);
    localStorage.setItem('subscribedChannels', JSON.stringify(subscribedChannels));
    updateSidebarSubscriptions();
    showAllSubscriptions();
    showNotification(`Unsubscribed from ${channelName}`);
}

function viewSubscribedChannel(channel) {
    // Show channel page with this channel's info
    const channelPage = document.getElementById('page-channel');
    const channelAvatar = channelPage.querySelector('.channel-avatar-xl');
    const channelName = channelPage.querySelector('.channel-info h1');
    
    channelAvatar.src = channel.avatar;
    channelName.textContent = channel.name;
    
    showPage('channel');
}

// ==================== ADMIN CHANNEL NAME EDIT ====================

function initAdminChannelNameEdit() {
    // Add channel settings to admin panel
    const adminOverview = document.getElementById('admin-overview');
    if (!adminOverview) return;
    
    // Check if already added
    if (document.getElementById('channelSettingsSection')) return;
    
    const settingsSection = document.createElement('div');
    settingsSection.id = 'channelSettingsSection';
    settingsSection.className = 'admin-section';
    settingsSection.style.marginTop = '24px';
    settingsSection.innerHTML = `
        <h3 style="color: #fff; margin-bottom: 16px;">Channel Settings</h3>
        <div class="form-group" style="max-width: 400px;">
            <label style="color: #ccc; display: block; margin-bottom: 8px;">Channel Name</label>
            <input type="text" id="adminChannelName" value="${currentUser.name}" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #fff;">
        </div>
        <div class="form-group" style="max-width: 400px; margin-top: 16px;">
            <label style="color: #ccc; display: block; margin-bottom: 8px;">Username</label>
            <input type="text" id="adminUsername" value="${currentUser.username}" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #fff;">
        </div>
        <button class="btn btn-primary" style="margin-top: 16px;" onclick="saveChannelSettings()">Save Changes</button>
    `;
    
    adminOverview.appendChild(settingsSection);
}

function saveChannelSettings() {
    const newName = document.getElementById('adminChannelName').value.trim();
    const newUsername = document.getElementById('adminUsername').value.trim();
    
    if (!newName || !newUsername) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    currentUser.name = newName;
    currentUser.username = newUsername;
    
    // Update channel page
    const channelPageName = document.querySelector('#page-channel .channel-info h1');
    const channelPageMeta = document.querySelector('#page-channel .channel-info p');
    
    if (channelPageName) channelPageName.textContent = newName;
    if (channelPageMeta) channelPageMeta.textContent = `@${newUsername} • 125K subscribers • 87 videos`;
    
    // Update user dropdown
    const dropdownName = document.querySelector('.user-dropdown .user-info h4');
    if (dropdownName) dropdownName.textContent = newName;
    
    showNotification('Channel settings saved!');
}

// ==================== UPLOADED VIDEOS ON CHANNEL ====================

function loadUserChannelVideos() {
    // Load from localStorage
    const stored = localStorage.getItem('uploadedVideos');
    const uploadedVideos = stored ? JSON.parse(stored) : [];
    
    const channelVideos = document.getElementById('channelVideos');
    if (!channelVideos) return;
    
    // Filter videos by current user's username
    const userVideos = uploadedVideos.filter(v => v.channelId === currentUser.username);
    
    if (userVideos.length === 0) {
        channelVideos.innerHTML = '<p style="color: #888; text-align: center; padding: 40px; grid-column: 1/-1;">No videos uploaded yet. <a href="#" onclick="navigateToPage(\'upload\'); return false;" style="color: #0091FF;">Upload your first video!</a></p>';
        return;
    }
    
    // Create video cards with delete button for own channel
    channelVideos.innerHTML = userVideos.map(video => {
        return `
            <div class="video-card user-video-card" data-video-id="${video.id}">
                <div class="thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}">
                    <span class="duration">${video.duration}</span>
                    <button class="delete-video-btn" data-video-id="${video.id}" title="Delete video">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
                <div class="video-info">
                    <div class="channel-icon">${video.channel.charAt(0)}</div>
                    <div class="video-details">
                        <h4>${video.title}</h4>
                        <p>${video.channel}</p>
                        <p>${video.views} views • ${video.date || video.uploadDate || 'Recently'}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click events for video cards
    channelVideos.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't navigate if clicking delete button
            if (e.target.closest('.delete-video-btn')) return;
            
            const videoId = parseInt(card.dataset.videoId);
            if (videoId) {
                currentVideoId = videoId;
                navigateToPage('watch');
            }
        });
    });
    
    // Add click events for delete buttons
    channelVideos.querySelectorAll('.delete-video-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = parseInt(btn.dataset.videoId);
            deleteVideo(videoId);
        });
    });
}

function updateChannelPage() {
    // Update channel header with current user info
    const channelPage = document.getElementById('page-channel');
    if (!channelPage || !currentUser.loggedIn) return;
    
    // Update channel name
    const channelName = channelPage.querySelector('.channel-info h1');
    if (channelName) {
        channelName.textContent = currentUser.name;
    }
    
    // Update channel avatar
    const channelAvatar = channelPage.querySelector('.channel-avatar-xl');
    if (channelAvatar && currentUser.avatar) {
        channelAvatar.src = currentUser.avatar;
    }
    
    // Update channel username
    const channelUsername = channelPage.querySelector('.channel-info p');
    if (channelUsername) {
        const stored = localStorage.getItem('uploadedVideos');
        const uploadedVideos = stored ? JSON.parse(stored) : [];
        const userVideos = uploadedVideos.filter(v => v.channelId === currentUser.username);
        channelUsername.textContent = `@${currentUser.username} • ${userVideos.length} videos`;
    }
    
    // Load channel videos
    loadUserChannelVideos();
}

// Delete video from channel
async function deleteVideo(videoId) {
    // Get uploaded videos from localStorage
    const stored = localStorage.getItem('uploadedVideos');
    let uploadedVideos = stored ? JSON.parse(stored) : [];
    
    // Find the video
    const videoIndex = uploadedVideos.findIndex(v => v.id === videoId);
    if (videoIndex === -1) {
        showNotification('Video not found', 'error');
        return;
    }
    
    const videoToDelete = uploadedVideos[videoIndex];
    
    // Show confirmation modal
    const confirmed = await showConfirmationModal({
        title: 'Delete Video',
        message: 'Are you sure you want to delete this video? This will remove the video, all its comments, and statistics.',
        itemName: videoToDelete.title,
        confirmText: 'Delete Video',
        type: 'video'
    });
    
    if (!confirmed) {
        return;
    }
    
    // Remove the video
    uploadedVideos.splice(videoIndex, 1);
    
    // Save back to localStorage
    localStorage.setItem('uploadedVideos', JSON.stringify(uploadedVideos));
    
    // Also remove from watch history if present
    const historyStored = localStorage.getItem('watchHistory');
    if (historyStored) {
        let watchHistory = JSON.parse(historyStored);
        watchHistory = watchHistory.filter(v => v.id !== videoId);
        localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
    }
    
    // Refresh the channel videos display
    loadUserChannelVideos();
    
    showNotification(`"${videoToDelete.title}" has been deleted`);
}

// Load uploaded videos when channel page is shown
const originalShowPage = window.showPage;
if (typeof originalShowPage === 'function') {
    window.showPage = function(pageId) {
        originalShowPage(pageId);
        if (pageId === 'channel') {
            setTimeout(loadUserChannelVideos, 100);
        }
    };
}

// Also hook into navigateToPage
const originalNavigateToPage = window.navigateToPage;
if (typeof originalNavigateToPage === 'function') {
    window.navigateToPage = function(pageId) {
        originalNavigateToPage(pageId);
        if (pageId === 'channel') {
            setTimeout(loadUserChannelVideos, 100);
        }
    };
}

// ==================== FIX COMMUNITY TAB FOR USER'S CHANNEL ====================

// Override showChannelTabContent to use current user info
const originalShowChannelTabContent = window.showChannelTabContent;
if (typeof originalShowChannelTabContent === 'function') {
    window.showChannelTabContent = function(tabName) {
        const videoGrid = document.getElementById('channelVideos');
        let contentContainer = document.getElementById('channelTabContent');
        
        if (!contentContainer) {
            contentContainer = document.createElement('div');
            contentContainer.id = 'channelTabContent';
            videoGrid.parentNode.insertBefore(contentContainer, videoGrid.nextSibling);
        }
        
        // Get current channel info from the page
        const channelName = document.querySelector('#page-channel .channel-info h1')?.textContent || currentUser.name;
        const channelAvatar = document.querySelector('#page-channel .channel-avatar-xl')?.src || currentUser.avatar;
        
        if (tabName === 'community') {
            videoGrid.style.display = 'none';
            contentContainer.style.display = 'block';
            contentContainer.innerHTML = `
                <div class="community-posts">
                    <div class="community-post">
                        <div class="post-header">
                            <img src="${channelAvatar}" alt="Avatar" class="post-avatar">
                            <div>
                                <h4>${channelName}</h4>
                                <span class="post-date">2 hours ago</span>
                            </div>
                        </div>
                        <p class="post-content">🎉 Big announcement coming tomorrow! Stay tuned for something exciting. What do you think it could be?</p>
                        <div class="post-actions">
                            <button class="post-btn" onclick="showNotification('Liked!')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 1.2K</button>
                            <button class="post-btn" onclick="showNotification('Disliked')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg></button>
                            <button class="post-btn" onclick="showNotification('Comment section')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> 85</button>
                        </div>
                    </div>
                    <div class="community-post">
                        <div class="post-header">
                            <img src="${channelAvatar}" alt="Avatar" class="post-avatar">
                            <div>
                                <h4>${channelName}</h4>
                                <span class="post-date">1 day ago</span>
                            </div>
                        </div>
                        <p class="post-content">Thanks for all the support! 🚀 You all are amazing. Drop a comment with your favorite video!</p>
                        <div class="post-actions">
                            <button class="post-btn" onclick="showNotification('Liked!')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> 856</button>
                            <button class="post-btn" onclick="showNotification('Disliked')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg></button>
                            <button class="post-btn" onclick="showNotification('Comment section')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> 124</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Call original for other tabs
            originalShowChannelTabContent(tabName);
        }
    };
}

// ==================== PLAYABLE SHORTS ====================

function initPlayableShorts() {
    const shortsContainer = document.getElementById('shortsContainer');
    if (!shortsContainer) return;
    
    // Sample shorts removed - only user-uploaded shorts will be displayed
    const shortsData = [];
    
    shortsContainer.innerHTML = shortsData.map((short, i) => `
        <div class="short-item" data-url="${short.url}">
            <div class="short-video-container" style="background: linear-gradient(${45 + i * 30}deg, #0091FF, #FF3B30); aspect-ratio: 9/16; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; overflow: hidden;">
                <video class="short-video" style="width: 100%; height: 100%; object-fit: cover; display: none;" loop muted playsinline>
                    <source src="${short.url}" type="video/mp4">
                </video>
                <div class="short-play-overlay" style="position: absolute; display: flex; align-items: center; justify-content: center;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
            </div>
            <h4 style="color: #fff; margin: 8px 0 4px; font-size: 14px;">${short.title}</h4>
            <p style="color: #888; font-size: 12px;">${short.views} views</p>
        </div>
    `).join('');
    
    // Add click events to play shorts
    shortsContainer.querySelectorAll('.short-item').forEach(item => {
        const videoContainer = item.querySelector('.short-video-container');
        const video = item.querySelector('.short-video');
        const overlay = item.querySelector('.short-play-overlay');
        
        videoContainer.addEventListener('click', () => {
            if (video.style.display === 'none') {
                // Play video
                video.style.display = 'block';
                overlay.style.display = 'none';
                video.muted = false;
                video.play();
            } else {
                // Pause video
                if (video.paused) {
                    video.play();
                    overlay.style.display = 'none';
                } else {
                    video.pause();
                    overlay.style.display = 'flex';
                }
            }
        });
    });
}

// Initialize shorts when page loads
document.addEventListener('DOMContentLoaded', initPlayableShorts);

// Also update channel shorts to be playable
const originalGenerateChannelShorts = window.generateChannelShorts;
window.generateChannelShorts = function() {
    // Sample shorts removed - only user-uploaded shorts will be displayed
    const shorts = [];
    
    return shorts.map((short, i) => `
        <div class="channel-short-card" onclick="playChannelShort('${short.url}', '${short.title}')">
            <div class="short-thumb" style="background: linear-gradient(${45 + i * 30}deg, #0091FF, #FF3B30);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
            <h4>${short.title}</h4>
            <p>${short.views} views</p>
        </div>
    `).join('');
};

function playChannelShort(url, title) {
    // Create fullscreen short player
    const player = document.createElement('div');
    player.id = 'shortPlayer';
    player.style.cssText = 'position: fixed; inset: 0; background: #000; z-index: 10000; display: flex; align-items: center; justify-content: center;';
    player.innerHTML = `
        <video autoplay loop style="max-height: 100%; max-width: 100%;">
            <source src="${url}" type="video/mp4">
        </video>
        <button onclick="document.getElementById('shortPlayer').remove()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div style="position: absolute; bottom: 20px; left: 20px; color: white;">
            <h3>${title}</h3>
        </div>
    `;
    document.body.appendChild(player);
}


// ==================== SEARCH FUNCTIONALITY ====================

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBox = document.querySelector('.search-box');
    if (!searchInput || !searchBox) return;
    
    // Create suggestions dropdown
    let suggestionsDropdown = document.getElementById('searchSuggestions');
    if (!suggestionsDropdown) {
        suggestionsDropdown = document.createElement('div');
        suggestionsDropdown.id = 'searchSuggestions';
        suggestionsDropdown.className = 'search-suggestions';
        searchBox.appendChild(suggestionsDropdown);
    }
    
    // Search suggestions data
    const trendingSearches = [
        "AI tutorials 2024",
        "Gaming highlights",
        "Music production",
        "Web development",
        "Cooking recipes",
        "Tech reviews",
        "Fitness workouts",
        "Travel vlogs"
    ];
    
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    
    // Show suggestions on focus
    searchInput.addEventListener('focus', () => {
        showSearchSuggestions(searchInput.value, recentSearches, trendingSearches);
    });
    
    // Update suggestions on input
    searchInput.addEventListener('input', () => {
        showSearchSuggestions(searchInput.value, recentSearches, trendingSearches);
    });
    
    // Hide suggestions on click outside
    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target)) {
            suggestionsDropdown.style.display = 'none';
        }
    });
    
    // Handle search submit
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
    
    // Search button click
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value);
        });
    }
}

function showSearchSuggestions(query, recentSearches, trendingSearches) {
    const dropdown = document.getElementById('searchSuggestions');
    if (!dropdown) return;
    
    let html = '';
    
    if (!query) {
        // Show recent and trending when empty
        if (recentSearches.length > 0) {
            html += `<div class="suggestion-section">
                <div class="suggestion-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Recent searches
                </div>
                ${recentSearches.slice(0, 5).map(s => `
                    <div class="suggestion-item" onclick="performSearch('${s}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>${s}</span>
                        <button class="remove-suggestion" onclick="event.stopPropagation(); removeRecentSearch('${s}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                `).join('')}
            </div>`;
        }
        
        html += `<div class="suggestion-section">
            <div class="suggestion-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                Trending searches
            </div>
            ${trendingSearches.map(s => `
                <div class="suggestion-item" onclick="performSearch('${s}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    <span>${s}</span>
                </div>
            `).join('')}
        </div>`;
    } else {
        // Filter and show matching suggestions
        const allSuggestions = [...new Set([...recentSearches, ...trendingSearches])];
        const matches = allSuggestions.filter(s => 
            s.toLowerCase().includes(query.toLowerCase())
        );
        
        // Also search videos
        const videoMatches = sampleVideos.filter(v => 
            v.title.toLowerCase().includes(query.toLowerCase()) ||
            v.channel.toLowerCase().includes(query.toLowerCase()) ||
            v.category.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 4);
        
        if (matches.length > 0) {
            html += matches.slice(0, 5).map(s => `
                <div class="suggestion-item" onclick="performSearch('${s}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>${highlightMatch(s, query)}</span>
                </div>
            `).join('');
        }
        
        if (videoMatches.length > 0) {
            html += `<div class="suggestion-divider"></div>`;
            html += videoMatches.map(v => `
                <div class="suggestion-item video-suggestion" onclick="showPage('watch'); loadVideo(${v.id});">
                    <img src="${v.thumbnail}" alt="" style="width: 60px; height: 34px; border-radius: 4px; object-fit: cover;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${v.title}</div>
                        <div style="font-size: 11px; color: #888;">${v.channel}</div>
                    </div>
                </div>
            `).join('');
        }
        
        if (!matches.length && !videoMatches.length) {
            html = `<div class="suggestion-item" onclick="performSearch('${query}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span>Search for "${query}"</span>
            </div>`;
        }
    }
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong style="color: #0091FF;">$1</strong>');
}

function performSearch(query) {
    if (!query.trim()) return;
    
    // Save to recent searches
    let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    recentSearches = recentSearches.filter(s => s !== query);
    recentSearches.unshift(query);
    recentSearches = recentSearches.slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    
    // Hide suggestions
    const dropdown = document.getElementById('searchSuggestions');
    if (dropdown) dropdown.style.display = 'none';
    
    // Update input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = query;
    
    // Search videos
    const results = sampleVideos.filter(v => 
        v.title.toLowerCase().includes(query.toLowerCase()) ||
        v.channel.toLowerCase().includes(query.toLowerCase()) ||
        v.category.toLowerCase().includes(query.toLowerCase()) ||
        v.description.toLowerCase().includes(query.toLowerCase())
    );
    
    // Also include uploaded videos
    const uploadedResults = uploadedVideos.filter(v => 
        v.title.toLowerCase().includes(query.toLowerCase()) ||
        v.channel.toLowerCase().includes(query.toLowerCase())
    );
    
    const allResults = [...results, ...uploadedResults];
    
    // Show results page
    showSearchResults(query, allResults);
}

function showSearchResults(query, results) {
    // Create or get search results page
    let searchPage = document.getElementById('page-search-results');
    if (!searchPage) {
        searchPage = document.createElement('section');
        searchPage.id = 'page-search-results';
        searchPage.className = 'page';
        document.getElementById('mainContent').appendChild(searchPage);
    }
    
    // Hide all pages and show search results
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    searchPage.classList.add('active');
    
    if (results.length === 0) {
        searchPage.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5" style="margin-bottom: 20px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <h2 style="color: #fff; margin-bottom: 8px;">No results found</h2>
                <p style="color: #888;">There are no videos available with these keywords</p>
                <p style="color: #666; margin-top: 16px;">Try writing the keywords correctly or try different keywords</p>
            </div>
        `;
    } else {
        searchPage.innerHTML = `
            <div style="margin-bottom: 24px;">
                <p style="color: #888;">Found ${results.length} result${results.length !== 1 ? 's' : ''} for "<span style="color: #fff;">${query}</span>"</p>
            </div>
            <div class="search-results-list">
                ${results.map(video => `
                    <div class="search-result-item" onclick="showPage('watch'); loadVideo(${video.id});">
                        <div class="result-thumbnail">
                            <img src="${video.thumbnail}" alt="${video.title}">
                            <span class="duration">${video.duration}</span>
                        </div>
                        <div class="result-info">
                            <h3>${video.title}</h3>
                            <p class="result-meta">${video.views} views • ${video.date}</p>
                            <div class="result-channel">
                                <img src="${video.channelAvatar}" alt="${video.channel}">
                                <span>${video.channel}</span>
                            </div>
                            <p class="result-description">${video.description || ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function removeRecentSearch(query) {
    let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    recentSearches = recentSearches.filter(s => s !== query);
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    
    // Refresh suggestions
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        showSearchSuggestions(searchInput.value, recentSearches, [
            "AI tutorials 2024", "Gaming highlights", "Music production",
            "Web development", "Cooking recipes", "Tech reviews"
        ]);
    }
}

// Initialize search on load
document.addEventListener('DOMContentLoaded', initSearch);


// ==================== FIX VIDEO PLAYBACK FROM SEARCH ====================

// Global function to play video from anywhere
window.playVideoById = function(videoId) {
    // Find video in sampleVideos or uploadedVideos
    let video = sampleVideos.find(v => v.id === videoId);
    if (!video) {
        const stored = localStorage.getItem('uploadedVideos');
        if (stored) {
            const uploadedVideos = JSON.parse(stored);
            video = uploadedVideos.find(v => v.id === videoId);
        }
    }
    
    if (video) {
        currentVideoId = videoId;
        navigateToPage('watch');
    } else {
        showNotification('Video not found', 'error');
    }
};

// Override the search result click handlers
const originalPerformSearch = window.performSearch;
window.performSearch = function(query) {
    if (!query.trim()) return;
    
    // Save to recent searches
    let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    recentSearches = recentSearches.filter(s => s !== query);
    recentSearches.unshift(query);
    recentSearches = recentSearches.slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    
    // Hide suggestions
    const dropdown = document.getElementById('searchSuggestions');
    if (dropdown) dropdown.style.display = 'none';
    
    // Update input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = query;
    
    // Get all uploaded videos from localStorage
    const stored = localStorage.getItem('uploadedVideos');
    const uploadedVideos = stored ? JSON.parse(stored) : [];
    
    // Load REELs from localStorage
    const reelsStored = localStorage.getItem('monitixeReels');
    const allReels = reelsStored ? JSON.parse(reelsStored) : [];
    
    const queryLower = query.toLowerCase();
    
    // Search function with relevance scoring
    function scoreVideo(video, query) {
        let score = 0;
        const titleLower = (video.title || '').toLowerCase();
        const channelLower = (video.channel || '').toLowerCase();
        const descLower = (video.description || '').toLowerCase();
        const categoryLower = (video.category || '').toLowerCase();
        
        // Exact title match (highest priority)
        if (titleLower === query) score += 1000;
        // Title starts with query
        else if (titleLower.startsWith(query)) score += 100;
        // Title contains query
        else if (titleLower.includes(query)) score += 50;
        
        // Channel match
        if (channelLower === query) score += 80;
        else if (channelLower.includes(query)) score += 30;
        
        // Category match
        if (categoryLower === query) score += 60;
        else if (categoryLower.includes(query)) score += 20;
        
        // Description match
        if (descLower.includes(query)) score += 10;
        
        return score;
    }
    
    // Score and filter videos
    const videoResults = uploadedVideos
        .map(v => ({ video: v, score: scoreVideo(v, queryLower) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.video);
    
    // Score and filter REELs
    const reelResults = allReels
        .map(r => ({ video: {...r, isReel: true}, score: scoreVideo(r, queryLower) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.video);
    
    const allResults = [...videoResults, ...reelResults];
    
    // Show results page with fixed click handlers
    showSearchResultsFixed(query, allResults);
};

function showSearchResultsFixed(query, results) {
    // Create or get search results page
    let searchPage = document.getElementById('page-search-results');
    if (!searchPage) {
        searchPage = document.createElement('section');
        searchPage.id = 'page-search-results';
        searchPage.className = 'page';
        document.getElementById('mainContent').appendChild(searchPage);
    }
    
    // Hide all pages and show search results
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    searchPage.classList.add('active');
    
    if (results.length === 0) {
        searchPage.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5" style="margin-bottom: 20px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <h2 style="color: #fff; margin-bottom: 8px;">No results found</h2>
                <p style="color: #888;">There are no videos available with these keywords</p>
                <p style="color: #666; margin-top: 16px;">Try writing the keywords correctly or try different keywords</p>
            </div>
        `;
    } else {
        searchPage.innerHTML = `
            <div style="margin-bottom: 24px;">
                <p style="color: #888;">Found ${results.length} result${results.length !== 1 ? 's' : ''} for "<span style="color: #fff;">${query}</span>"</p>
            </div>
            <div class="search-results-list" id="searchResultsList">
                ${results.map(video => `
                    <div class="search-result-item" data-video-id="${video.id}" data-is-reel="${video.isReel ? 'true' : 'false'}">
                        <div class="result-thumbnail">
                            <img src="${video.thumbnail}" alt="${video.title}">
                            <span class="duration">${video.duration || (video.isReel ? 'REEL' : '')}</span>
                            ${video.isReel ? '<span class="shorts-badge" style="background: rgba(255, 0, 0, 0.9);">REEL</span>' : ''}
                        </div>
                        <div class="result-info">
                            <h3>${video.title}</h3>
                            <p class="result-meta">${video.views} views • ${video.date}</p>
                            <div class="result-channel">
                                <img src="${video.channelAvatar}" alt="${video.channel}">
                                <span>${video.channel}</span>
                            </div>
                            <p class="result-description">${video.description || ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add click handlers
        searchPage.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const isReel = item.dataset.isReel === 'true';
                const videoId = item.dataset.videoId;
                
                if (isReel) {
                    // Navigate to reels page and scroll to this reel
                    navigateToPage('reels');
                    setTimeout(() => {
                        const reelElement = document.querySelector(`[data-reel-id="${videoId}"]`);
                        if (reelElement) {
                            reelElement.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 300);
                } else {
                    // Navigate to regular video watch page
                    currentVideoId = parseInt(videoId);
                    navigateToPage('watch');
                }
            });
        });
    }
}

// Also fix suggestion video clicks
const originalShowSearchSuggestions = window.showSearchSuggestions;
window.showSearchSuggestions = function(query, recentSearches, trendingSearches) {
    const dropdown = document.getElementById('searchSuggestions');
    if (!dropdown) return;
    
    let html = '';
    
    if (!query) {
        // Show recent and trending when empty
        if (recentSearches.length > 0) {
            html += `<div class="suggestion-section">
                <div class="suggestion-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Recent searches
                </div>
                ${recentSearches.slice(0, 5).map(s => `
                    <div class="suggestion-item" onclick="performSearch('${s.replace(/'/g, "\\'")}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>${s}</span>
                        <button class="remove-suggestion" onclick="event.stopPropagation(); removeRecentSearch('${s.replace(/'/g, "\\'")}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                `).join('')}
            </div>`;
        }
        
        html += `<div class="suggestion-section">
            <div class="suggestion-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                Trending searches
            </div>
            ${trendingSearches.map(s => `
                <div class="suggestion-item" onclick="performSearch('${s.replace(/'/g, "\\'")}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    <span>${s}</span>
                </div>
            `).join('')}
        </div>`;
    } else {
        // Filter and show matching suggestions
        const allSuggestions = [...new Set([...recentSearches, ...trendingSearches])];
        const matches = allSuggestions.filter(s => 
            s.toLowerCase().includes(query.toLowerCase())
        );
        
        // Also search videos
        const videoMatches = sampleVideos.filter(v => 
            v.title.toLowerCase().includes(query.toLowerCase()) ||
            v.channel.toLowerCase().includes(query.toLowerCase()) ||
            v.category.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 4);
        
        if (matches.length > 0) {
            html += matches.slice(0, 5).map(s => `
                <div class="suggestion-item" onclick="performSearch('${s.replace(/'/g, "\\'")}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>${highlightMatch(s, query)}</span>
                </div>
            `).join('');
        }
        
        if (videoMatches.length > 0) {
            html += `<div class="suggestion-divider"></div>`;
            html += videoMatches.map(v => `
                <div class="suggestion-item video-suggestion" data-video-id="${v.id}">
                    <img src="${v.thumbnail}" alt="" style="width: 60px; height: 34px; border-radius: 4px; object-fit: cover;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${v.title}</div>
                        <div style="font-size: 11px; color: #888;">${v.channel}</div>
                    </div>
                </div>
            `).join('');
        }
        
        if (!matches.length && !videoMatches.length) {
            html = `<div class="suggestion-item" onclick="performSearch('${query.replace(/'/g, "\\'")}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span>Search for "${query}"</span>
            </div>`;
        }
    }
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    
    // Add click handlers for video suggestions
    dropdown.querySelectorAll('.video-suggestion[data-video-id]').forEach(item => {
        item.addEventListener('click', () => {
            const videoId = parseInt(item.dataset.videoId);
            currentVideoId = videoId;
            dropdown.style.display = 'none';
            navigateToPage('watch');
        });
    });
};


// ==================== PLAYLIST FUNCTIONALITY ====================

// Playlist storage
let userPlaylists = JSON.parse(localStorage.getItem('userPlaylists') || '[]');

// Default playlists if none exist
if (userPlaylists.length === 0) {
    userPlaylists = [
        {
            id: 1,
            name: "Favorites",
            description: "My favorite videos",
            videos: [1, 2, 3],
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            name: "Watch Later",
            description: "Videos to watch later",
            videos: [4, 5],
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            name: "Learning",
            description: "Educational content",
            videos: [4, 8],
            createdAt: new Date().toISOString()
        }
    ];
    localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
}

function initPlaylists() {
    // Create playlist button
    const createBtn = document.querySelector('#page-playlists .btn-primary');
    if (createBtn) {
        createBtn.addEventListener('click', openCreatePlaylistModal);
    }
    
    // Load playlists
    loadPlaylistsGrid();
}

function loadPlaylistsGrid() {
    const grid = document.getElementById('playlistsGrid');
    if (!grid) return;
    
    if (userPlaylists.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; grid-column: 1/-1;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5" style="margin-bottom: 16px;">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <h3 style="color: #fff; margin-bottom: 8px;">No playlists yet</h3>
                <p style="color: #888;">Create your first playlist to organize your videos</p>
            </div>
        `;
        return;
    }
    
    // Load uploaded videos for thumbnail lookup
    const storedUploaded = localStorage.getItem('uploadedVideos');
    const uploadedVideos = storedUploaded ? JSON.parse(storedUploaded) : [];
    
    grid.innerHTML = userPlaylists.map(playlist => {
        const videoCount = playlist.videos.length;
        let firstVideo = playlist.videos.length > 0 ? sampleVideos.find(v => v.id === playlist.videos[0]) : null;
        if (!firstVideo && playlist.videos.length > 0) {
            firstVideo = uploadedVideos.find(v => v.id === playlist.videos[0]);
        }
        const thumbnail = firstVideo ? firstVideo.thumbnail : 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=640';
        
        return `
            <div class="playlist-card-item" data-playlist-id="${playlist.id}">
                <div class="playlist-thumbnail" style="background-image: url('${thumbnail}');">
                    <div class="playlist-overlay">
                        <span class="playlist-count">${videoCount} video${videoCount !== 1 ? 's' : ''}</span>
                        <button class="play-playlist-btn">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        </button>
                    </div>
                </div>
                <div class="playlist-info">
                    <h3>${playlist.name}</h3>
                    <p>${playlist.description || 'No description'}</p>
                    <div class="playlist-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); editPlaylist(${playlist.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deletePlaylist(${playlist.id})">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers to open playlist
    grid.querySelectorAll('.playlist-card-item').forEach(card => {
        card.addEventListener('click', () => {
            const playlistId = parseInt(card.dataset.playlistId);
            openPlaylistView(playlistId);
        });
    });
}

function openCreatePlaylistModal() {
    // Remove existing modal
    const existingModal = document.getElementById('createPlaylistModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'createPlaylistModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h2>Create Playlist</h2>
                <button class="close-modal" onclick="document.getElementById('createPlaylistModal').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Playlist Name</label>
                    <input type="text" id="newPlaylistName" placeholder="Enter playlist name" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #fff;">
                </div>
                <div class="form-group" style="margin-top: 16px;">
                    <label>Description (optional)</label>
                    <textarea id="newPlaylistDesc" placeholder="Add a description" rows="3" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #fff; resize: none;"></textarea>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="document.getElementById('createPlaylistModal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="createNewPlaylist()">Create</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus input
    document.getElementById('newPlaylistName').focus();
}

function createNewPlaylist() {
    const name = document.getElementById('newPlaylistName').value.trim();
    const description = document.getElementById('newPlaylistDesc').value.trim();
    
    if (!name) {
        showNotification('Please enter a playlist name', 'error');
        return;
    }
    
    const newPlaylist = {
        id: Date.now(),
        name: name,
        description: description,
        videos: [],
        createdAt: new Date().toISOString()
    };
    
    userPlaylists.unshift(newPlaylist);
    localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
    
    document.getElementById('createPlaylistModal').remove();
    
    // Check if we have a current video (meaning we came from save modal)
    if (currentVideoId) {
        // Reopen save modal to show the new playlist
        openSaveModal();
    } else {
        // We're on the playlists page, just refresh the grid
        loadPlaylistsGrid();
    }
    
    showNotification(`Playlist "${name}" created!`);
}

function editPlaylist(playlistId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const existingModal = document.getElementById('editPlaylistModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'editPlaylistModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h2>Edit Playlist</h2>
                <button class="close-modal" onclick="document.getElementById('editPlaylistModal').remove()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Playlist Name</label>
                    <input type="text" id="editPlaylistName" value="${playlist.name}" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #fff;">
                </div>
                <div class="form-group" style="margin-top: 16px;">
                    <label>Description</label>
                    <textarea id="editPlaylistDesc" rows="3" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid #333; border-radius: 8px; color: #fff; resize: none;">${playlist.description || ''}</textarea>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="document.getElementById('editPlaylistModal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="savePlaylistEdit(${playlistId})">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function savePlaylistEdit(playlistId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const name = document.getElementById('editPlaylistName').value.trim();
    const description = document.getElementById('editPlaylistDesc').value.trim();
    
    if (!name) {
        showNotification('Please enter a playlist name', 'error');
        return;
    }
    
    playlist.name = name;
    playlist.description = description;
    localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
    
    document.getElementById('editPlaylistModal').remove();
    loadPlaylistsGrid();
    showNotification('Playlist updated!');
}

async function deletePlaylist(playlistId) {
    // Find the playlist to get its name
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) {
        showNotification('Playlist not found', 'error');
        return;
    }
    
    // Show confirmation modal
    const confirmed = await showConfirmationModal({
        title: 'Delete Playlist',
        message: 'Are you sure you want to delete this playlist? The videos will not be deleted, only the playlist.',
        itemName: playlist.name,
        confirmText: 'Delete Playlist',
        type: 'playlist'
    });
    
    if (!confirmed) return;
    
    userPlaylists = userPlaylists.filter(p => p.id !== playlistId);
    localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
    loadPlaylistsGrid();
    showNotification('Playlist deleted successfully');
}

function openPlaylistView(playlistId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    // Get uploaded videos from localStorage
    const storedUploaded = localStorage.getItem('uploadedVideos');
    const uploadedVideos = storedUploaded ? JSON.parse(storedUploaded) : [];
    
    // Get videos for this playlist
    const playlistVideos = playlist.videos.map(videoId => {
        return sampleVideos.find(v => v.id === videoId) || uploadedVideos.find(v => v.id === videoId);
    }).filter(v => v);
    
    // Create or get playlist view page
    let playlistPage = document.getElementById('page-playlist-view');
    if (!playlistPage) {
        playlistPage = document.createElement('section');
        playlistPage.id = 'page-playlist-view';
        playlistPage.className = 'page';
        document.getElementById('mainContent').appendChild(playlistPage);
    }
    
    // Hide all pages and show playlist view
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    playlistPage.classList.add('active');
    
    const firstVideo = playlistVideos[0];
    
    playlistPage.innerHTML = `
        <div class="playlist-view">
            <button class="btn btn-secondary" onclick="navigateToPage('playlists')" style="margin-bottom: 20px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Back to Playlists
            </button>
            
            <div class="playlist-header-view" style="display: flex; gap: 24px; margin-bottom: 24px;">
                <div class="playlist-cover" style="width: 300px; aspect-ratio: 16/9; background: linear-gradient(135deg, #0091FF, #FF3B30); border-radius: 12px; overflow: hidden; position: relative;">
                    ${firstVideo ? `<img src="${firstVideo.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
                    <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
                        <button class="btn btn-primary" onclick="playPlaylist(${playlistId})" style="display: flex; align-items: center; gap: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            Play All
                        </button>
                    </div>
                </div>
                <div class="playlist-details" style="flex: 1;">
                    <h1 style="color: #fff; margin-bottom: 8px;">${playlist.name}</h1>
                    <p style="color: #888; margin-bottom: 16px;">${playlist.description || 'No description'}</p>
                    <p style="color: #aaa; font-size: 14px;">${playlistVideos.length} video${playlistVideos.length !== 1 ? 's' : ''}</p>
                </div>
            </div>
            
            <div class="playlist-videos-list">
                ${playlistVideos.length === 0 ? `
                    <div style="text-align: center; padding: 40px; background: #1a1a1a; border-radius: 12px;">
                        <p style="color: #888;">This playlist is empty</p>
                        <p style="color: #666; font-size: 13px; margin-top: 8px;">Add videos using the "Save" button while watching</p>
                    </div>
                ` : playlistVideos.map((video, index) => `
                    <div class="playlist-video-item" data-video-id="${video.id}" style="display: flex; gap: 16px; padding: 12px; background: #1a1a1a; border-radius: 12px; margin-bottom: 8px; cursor: pointer; transition: background 0.15s;">
                        <span style="color: #888; width: 30px; text-align: center; align-self: center;">${index + 1}</span>
                        <div style="width: 160px; aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; flex-shrink: 0;">
                            <img src="${video.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <h4 style="color: #fff; margin-bottom: 4px; font-size: 14px;">${video.title}</h4>
                            <p style="color: #888; font-size: 13px;">${video.channel}</p>
                            <p style="color: #666; font-size: 12px;">${video.views} views</p>
                        </div>
                        <button class="btn-icon" onclick="event.stopPropagation(); removeFromPlaylist(${playlistId}, ${video.id})" style="align-self: center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Add click handlers to play videos
    playlistPage.querySelectorAll('.playlist-video-item').forEach(item => {
        item.addEventListener('click', () => {
            const videoId = parseInt(item.dataset.videoId);
            currentVideoId = videoId;
            navigateToPage('watch');
        });
        
        // Hover effect
        item.addEventListener('mouseenter', () => item.style.background = '#252525');
        item.addEventListener('mouseleave', () => item.style.background = '#1a1a1a');
    });
}

function playPlaylist(playlistId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist || playlist.videos.length === 0) {
        showNotification('Playlist is empty', 'error');
        return;
    }
    
    // Play first video
    currentVideoId = playlist.videos[0];
    navigateToPage('watch');
    showNotification(`Playing playlist: ${playlist.name}`);
}

function removeFromPlaylist(playlistId, videoId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    playlist.videos = playlist.videos.filter(id => id !== videoId);
    localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
    
    openPlaylistView(playlistId);
    showNotification('Video removed from playlist');
}

// Add to playlist from save modal
window.addToPlaylist = function(playlistId) {
    const playlist = userPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    if (!playlist.videos.includes(currentVideoId)) {
        playlist.videos.push(currentVideoId);
        localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
        showNotification(`Added to "${playlist.name}"`);
    } else {
        showNotification('Already in playlist');
    }
    
    // Close save modal if open
    const saveModal = document.getElementById('saveModal');
    if (saveModal) saveModal.classList.remove('active');
};

// Update save modal to show playlists
const originalOpenSaveModal = window.openModal;
window.openSaveModal = function() {
    const saveModal = document.getElementById('saveModal');
    if (!saveModal) return;
    
    const playlistList = saveModal.querySelector('.save-options') || saveModal.querySelector('.modal-body');
    if (playlistList) {
        playlistList.innerHTML = `
            <div style="margin-bottom: 16px;">
                <button class="btn btn-secondary" onclick="openCreatePlaylistModal()" style="width: 100%;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create new playlist
                </button>
            </div>
            <div class="playlists-list">
                ${userPlaylists.map(playlist => `
                    <div class="playlist-option" onclick="addToPlaylist(${playlist.id})" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #1a1a1a; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: background 0.15s;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                        <div style="flex: 1;">
                            <div style="color: #fff; font-size: 14px;">${playlist.name}</div>
                            <div style="color: #888; font-size: 12px;">${playlist.videos.length} videos</div>
                        </div>
                        ${playlist.videos.includes(currentVideoId) ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="#0091FF" stroke="#0091FF" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add hover effect
        playlistList.querySelectorAll('.playlist-option').forEach(opt => {
            opt.addEventListener('mouseenter', () => opt.style.background = '#252525');
            opt.addEventListener('mouseleave', () => opt.style.background = '#1a1a1a');
        });
    }
    
    saveModal.classList.add('active');
};

// Initialize playlists on load
document.addEventListener('DOMContentLoaded', initPlaylists);

// Handle "Add to Playlist" button clicks on video cards
document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.add-to-playlist-btn');
    if (addBtn) {
        e.stopPropagation(); // Prevent video card click
        
        if (!currentUser.loggedIn) {
            showToast('Please sign in to save videos', 'error');
            return;
        }
        
        const videoId = parseInt(addBtn.dataset.videoId);
        currentVideoId = videoId; // Set the current video for the save modal
        openSaveModal();
    }
});

// Handle comment input - post comment on Enter key
document.addEventListener('keypress', (e) => {
    if (e.target.matches('.comment-input input') || e.target.id === 'commentInputField') {
        if (e.key === 'Enter') {
            const text = e.target.value;
            postComment(text);
            e.target.value = ''; // Clear input
        }
    }
});

// Also handle input focus to ensure it's accessible
document.addEventListener('DOMContentLoaded', () => {
    const commentInput = document.getElementById('commentInputField');
    if (commentInput) {
        // Ensure input is not disabled
        commentInput.disabled = false;
        commentInput.readOnly = false;
        
        // Update avatar when user is logged in
        if (currentUser.loggedIn && currentUser.avatar) {
            const commentAvatar = document.getElementById('commentUserAvatar');
            if (commentAvatar) {
                commentAvatar.src = currentUser.avatar;
            }
        }
    }
});

// Handle delete comment button clicks
document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-comment-btn');
    if (deleteBtn) {
        e.stopPropagation();
        const commentId = parseInt(deleteBtn.dataset.commentId);
        deleteComment(commentId);
    }
});


// ==================== CLEAR HISTORY FUNCTIONALITY ====================

function initClearHistory() {
    const clearBtn = document.querySelector('#page-history .btn-secondary');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllHistory);
    }
}

function clearAllHistory() {
    if (!confirm('Are you sure you want to clear your entire watch history?')) return;
    
    // Clear history from localStorage
    localStorage.removeItem('watchHistory');
    
    // Clear the history videos grid
    const historyGrid = document.getElementById('historyVideos');
    if (historyGrid) {
        historyGrid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; grid-column: 1/-1;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5" style="margin-bottom: 16px;">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <h3 style="color: #fff; margin-bottom: 8px;">No watch history</h3>
                <p style="color: #888;">Videos you watch will appear here</p>
            </div>
        `;
    }
    
    showNotification('Watch history cleared');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initClearHistory);


// ==================== WATCH HISTORY TRACKING ====================

let watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
let historyTrackingTimer = null;

function trackVideoWatch(videoId) {
    // Clear any existing timer
    if (historyTrackingTimer) {
        clearTimeout(historyTrackingTimer);
    }
    
    // Add to history after 2 seconds of watching
    historyTrackingTimer = setTimeout(() => {
        addToWatchHistory(videoId);
    }, 2000);
}

function addToWatchHistory(videoId) {
    // Find the video
    let video = sampleVideos.find(v => v.id === videoId);
    if (!video) {
        const stored = localStorage.getItem('uploadedVideos');
        if (stored) {
            const uploadedVideos = JSON.parse(stored);
            video = uploadedVideos.find(v => v.id === videoId);
        }
    }
    if (!video) return;
    
    // Remove if already exists (to move to top)
    watchHistory = watchHistory.filter(h => h.videoId !== videoId);
    
    // Add to beginning with timestamp
    watchHistory.unshift({
        videoId: videoId,
        watchedAt: new Date().toISOString()
    });
    
    // Keep only last 100 items
    watchHistory = watchHistory.slice(0, 100);
    
    // Save to localStorage
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
}

function loadWatchHistory() {
    const historyGrid = document.getElementById('historyVideos');
    if (!historyGrid) return;
    
    watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    
    if (watchHistory.length === 0) {
        historyGrid.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; grid-column: 1/-1;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5" style="margin-bottom: 16px;">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <h3 style="color: #fff; margin-bottom: 8px;">No watch history</h3>
                <p style="color: #888;">Videos you watch will appear here</p>
            </div>
        `;
        return;
    }
    
    // Get video details for history items
    const storedUploaded = localStorage.getItem('uploadedVideos');
    const uploadedVideos = storedUploaded ? JSON.parse(storedUploaded) : [];
    
    const historyVideos = watchHistory.map(h => {
        let video = sampleVideos.find(v => v.id === h.videoId);
        if (!video) {
            video = uploadedVideos.find(v => v.id === h.videoId);
        }
        if (video) {
            return { ...video, watchedAt: h.watchedAt };
        }
        return null;
    }).filter(v => v);
    
    historyGrid.innerHTML = historyVideos.map(video => `
        <div class="video-card" data-video-id="${video.id}">
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}">
                <span class="video-duration">${video.duration}</span>
            </div>
            <div class="video-card-content">
                <div class="channel-avatar">
                    <img src="${video.channelAvatar}" alt="${video.channel}">
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <div class="video-meta">
                        <span>${video.channel}</span>
                        <span>•</span>
                        <span>${video.views} views</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    historyGrid.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => {
            const videoId = parseInt(card.dataset.videoId);
            currentVideoId = videoId;
            navigateToPage('watch');
        });
    });
}

// Hook into video player to track watches
function initHistoryTracking() {
    // Override loadWatchPage to track history
    const originalLoadWatchPage = window.loadWatchPage;
    if (typeof originalLoadWatchPage === 'function') {
        window.loadWatchPage = function(videoId) {
            originalLoadWatchPage(videoId);
            trackVideoWatch(videoId);
        };
    }
    
    // Also track when navigating to watch page
    const originalNavigateToPage = window.navigateToPage;
    if (typeof originalNavigateToPage === 'function') {
        window.navigateToPage = function(pageName) {
            originalNavigateToPage(pageName);
            if (pageName === 'watch') {
                trackVideoWatch(currentVideoId);
            }
            if (pageName === 'history') {
                loadWatchHistory();
            }
            if (pageName === 'subscriptions') {
                loadSubscriptionsPage();
            }
        };
    }
}

// ==================== FIX SUBSCRIPTIONS PAGE ====================

function loadSubscriptionsPage() {
    const container = document.getElementById('subscriptionsList');
    if (!container) return;
    
    // Load subscribed channels
    const stored = localStorage.getItem('subscribedChannels');
    if (stored) {
        subscribedChannels = JSON.parse(stored);
    }
    
    if (subscribedChannels.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5" style="margin-bottom: 16px;">
                    <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
                </svg>
                <h3 style="color: #fff; margin-bottom: 8px;">No subscriptions yet</h3>
                <p style="color: #888;">Channels you subscribe to will appear here</p>
                <button class="btn btn-primary" style="margin-top: 20px;" onclick="navigateToPage('explore')">Explore Channels</button>
            </div>
        `;
        return;
    }
    
    // Show subscribed channels with their videos
    container.innerHTML = `
        <div class="subscriptions-header" style="margin-bottom: 24px;">
            <p style="color: #888;">${subscribedChannels.length} subscription${subscribedChannels.length !== 1 ? 's' : ''}</p>
        </div>
        <div class="subscribed-channels-list">
            ${subscribedChannels.map(channel => {
                // Find videos from this channel
                const channelVideos = sampleVideos.filter(v => 
                    v.channel.toLowerCase() === channel.name.toLowerCase()
                ).slice(0, 4);
                
                return `
                    <div class="subscribed-channel-section" style="margin-bottom: 32px;">
                        <div class="channel-header-row" style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                            <img src="${channel.avatar}" alt="${channel.name}" style="width: 56px; height: 56px; border-radius: 50%; cursor: pointer;" onclick="viewChannelByName('${channel.name}', '${channel.avatar}')">
                            <div style="flex: 1;">
                                <h3 style="color: #fff; cursor: pointer;" onclick="viewChannelByName('${channel.name}', '${channel.avatar}')">${channel.name}</h3>
                                <p style="color: #888; font-size: 13px;">Subscribed</p>
                            </div>
                            <button class="btn btn-secondary" onclick="unsubscribeChannel('${channel.name}')">Unsubscribe</button>
                        </div>
                        ${channelVideos.length > 0 ? `
                            <div class="channel-videos-row" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;">
                                ${channelVideos.map(video => `
                                    <div class="video-card-mini" data-video-id="${video.id}" style="cursor: pointer;">
                                        <div style="aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; margin-bottom: 8px; position: relative;">
                                            <img src="${video.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;">
                                            <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.8); padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #fff;">${video.duration}</span>
                                        </div>
                                        <h4 style="color: #fff; font-size: 14px; margin-bottom: 4px; line-height: 1.3;">${video.title}</h4>
                                        <p style="color: #888; font-size: 12px;">${video.views} views • ${video.date}</p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p style="color: #666; font-size: 13px;">No recent videos from this channel</p>
                        `}
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // Add click handlers for videos
    container.querySelectorAll('.video-card-mini').forEach(card => {
        card.addEventListener('click', () => {
            const videoId = parseInt(card.dataset.videoId);
            currentVideoId = videoId;
            navigateToPage('watch');
        });
    });
}

function viewChannelByName(name, avatar) {
    const channelPage = document.getElementById('page-channel');
    const channelAvatar = channelPage.querySelector('.channel-avatar-xl');
    const channelNameElem = channelPage.querySelector('.channel-info h1');
    const channelMeta = channelPage.querySelector('.channel-info p');
    
    if (channelAvatar) channelAvatar.src = avatar;
    if (channelNameElem) channelNameElem.textContent = name;
    
    // Load all uploaded videos from localStorage
    const stored = localStorage.getItem('uploadedVideos');
    const allVideos = stored ? JSON.parse(stored) : [];
    
    // Filter videos by channel name (case-insensitive)
    const channelVideos = allVideos.filter(v => 
        v.channel && v.channel.toLowerCase() === name.toLowerCase()
    );
    
    // Update metadata with actual counts
    const subscriberCount = getSubscriberCount(name.toLowerCase().replace(/\s/g, ''));
    if (channelMeta) {
        channelMeta.textContent = `@${name.toLowerCase().replace(/\s/g, '')} • ${subscriberCount} subscribers • ${channelVideos.length} videos`;
    }
    
    // Load channel videos
    const videosGrid = document.getElementById('channelVideos');
    if (videosGrid) {
        if (channelVideos.length === 0) {
            videosGrid.innerHTML = '<p style="color: #888; text-align: center; padding: 40px; grid-column: 1/-1;">The channel you\'ve clicked on has no video uploaded</p>';
        } else {
            videosGrid.innerHTML = channelVideos.map(video => createVideoCard(video)).join('');
            
            videosGrid.querySelectorAll('.video-card').forEach(card => {
                card.addEventListener('click', () => {
                    const videoId = parseInt(card.dataset.videoId);
                    currentVideoId = videoId;
                    loadWatchPage(videoId);
                });
            });
        }
    }
    
    navigateToPage('channel');
}

function unsubscribeChannel(channelName) {
    subscribedChannels = subscribedChannels.filter(c => c.name !== channelName);
    localStorage.setItem('subscribedChannels', JSON.stringify(subscribedChannels));
    updateSidebarSubscriptions();
    loadSubscriptionsPage();
    showNotification(`Unsubscribed from ${channelName}`);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initHistoryTracking);


// ==================== STUDIO PAGE FUNCTIONALITY ====================

function loadStudioPage() {
    if (!currentUser.email) {
        showNotification('Please log in to view your studio');
        return;
    }

    console.log('=== LOADING STUDIO PAGE ===');
    console.log('Current user:', currentUser);

    // Get all uploaded videos
    const stored = localStorage.getItem('uploadedVideos');
    const allVideos = stored ? JSON.parse(stored) : [];
    
    // Filter videos by current user's channelId
    const userVideos = allVideos.filter(v => v.channelId === currentUser.username);
    
    // Get comments for statistics
    const storedComments = localStorage.getItem('videoComments');
    const allComments = storedComments ? JSON.parse(storedComments) : {};
    
    // Calculate totals
    let totalViews = 0;
    let totalWatchTime = 0; // in minutes
    let totalEarnings = 0;
    let totalComments = 0;
    
    userVideos.forEach(video => {
        // Parse views (convert "1.2K" to 1200, "1M" to 1000000)
        const viewCount = parseViewCount(video.views || '0');
        totalViews += viewCount;
        
        // Use stored watch time if available, otherwise estimate
        if (video.watchTime !== undefined) {
            totalWatchTime += (video.watchTime / 60); // Convert seconds to minutes
        } else {
            // Estimate watch time based on duration and views (assume 50% completion rate)
            const durationMinutes = parseDuration(video.duration || '0:00');
            totalWatchTime += (durationMinutes * viewCount * 0.5);
        }
        
        // Use stored earnings if available, otherwise calculate
        if (video.earnings !== undefined) {
            totalEarnings += video.earnings;
        } else {
            // Calculate earnings ($0.001 to $0.005 per view)
            totalEarnings += (viewCount * 0.003);
        }
        
        // Count comments for this video
        const videoComments = allComments[video.id] || [];
        totalComments += videoComments.length;
    });
    
    // Update statistics display
    document.getElementById('studioTotalViews').textContent = formatNumber(totalViews);
    document.getElementById('studioTotalWatchTime').textContent = formatWatchTime(totalWatchTime);
    document.getElementById('studioTotalEarnings').textContent = '$' + totalEarnings.toFixed(2);
    document.getElementById('studioTotalComments').textContent = totalComments;
    
    // Load videos list
    loadStudioVideosList(userVideos, allComments);
    
    // Load REELs list (handled by clean REELS code)
    loadStudioReels();
    
    console.log('=== STUDIO PAGE LOADED ===');
}

function parseViewCount(viewString) {
    const str = viewString.toString().toUpperCase();
    if (str.includes('M')) {
        return parseFloat(str) * 1000000;
    } else if (str.includes('K')) {
        return parseFloat(str) * 1000;
    }
    return parseInt(str) || 0;
}

function parseDuration(duration) {
    // Convert "12:35" or "1:05:30" to minutes
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] + parts[1] / 60;
    } else if (parts.length === 3) {
        return parts[0] * 60 + parts[1] + parts[2] / 60;
    }
    return 0;
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatWatchTime(minutes) {
    const hours = Math.floor(minutes / 60);
    if (hours >= 1000) {
        return (hours / 1000).toFixed(1) + 'K hrs';
    }
    return hours + 'h';
}

function loadStudioVideosList(videos, allComments) {
    const container = document.getElementById('studioVideosList');
    
    if (videos.length === 0) {
        container.innerHTML = `
            <div class="empty-studio">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                    <polyline points="17 2 12 7 7 2"/>
                </svg>
                <h3>No videos uploaded yet</h3>
                <p>Start creating content and it will appear here</p>
                <button class="btn btn-primary" onclick="navigateToPage('upload')">Upload Video</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = videos.map(video => {
        const videoComments = allComments[video.id] || [];
        const viewCount = parseViewCount(video.views || '0');
        const durationMinutes = parseDuration(video.duration || '0:00');
        
        // Use stored values if available, otherwise calculate
        const watchTime = video.watchTime 
            ? formatWatchTime(video.watchTime / 60)  // watchTime is stored in seconds
            : formatWatchTime(durationMinutes * viewCount * 0.5);
        const earnings = video.earnings !== undefined 
            ? video.earnings.toFixed(2) 
            : (viewCount * 0.003).toFixed(2);
        
        return `
            <div class="studio-video-item" data-video-id="${video.id}">
                <img src="${video.thumbnail}" alt="${video.title}" class="studio-video-thumbnail">
                <div class="studio-video-info">
                    <div class="studio-video-title">${video.title}</div>
                    <div class="studio-video-meta">${video.status === 'draft' ? 'Draft • ' : ''}Uploaded ${video.date}</div>
                    <div class="studio-video-stats">
                        <div class="stat-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            <span>${video.views} views</span>
                        </div>
                        <div class="stat-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span>${watchTime}</span>
                        </div>
                        <div class="stat-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                            <span>$${earnings}</span>
                        </div>
                        <div class="stat-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            <span>${videoComments.length} comments</span>
                        </div>
                    </div>
                </div>
                <div class="studio-video-actions">
                    <button class="action-btn" onclick="viewStudioVideo(${video.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                    </button>
                    <button class="action-btn delete" onclick="deleteStudioVideo(${video.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function viewStudioVideo(videoId) {
    currentVideoId = videoId;
    navigateToPage('watch');
}

async function deleteStudioVideo(videoId) {
    // Get all videos
    const stored = localStorage.getItem('uploadedVideos');
    let allVideos = stored ? JSON.parse(stored) : [];
    
    // Find the video to get its title
    const videoToDelete = allVideos.find(v => v.id === videoId);
    if (!videoToDelete) {
        showNotification('Video not found', 'error');
        return;
    }
    
    // Show confirmation modal
    const confirmed = await showConfirmationModal({
        title: 'Delete Video',
        message: 'Are you sure you want to delete this video? This will permanently remove the video, all comments, and viewing statistics.',
        itemName: videoToDelete.title,
        confirmText: 'Delete Video',
        type: 'video'
    });
    
    if (!confirmed) {
        return;
    }
    
    // Remove the video
    allVideos = allVideos.filter(v => v.id !== videoId);
    
    // Save back
    localStorage.setItem('uploadedVideos', JSON.stringify(allVideos));
    
    // Also remove comments for this video
    const storedComments = localStorage.getItem('videoComments');
    const allComments = storedComments ? JSON.parse(storedComments) : {};
    delete allComments[videoId];
    localStorage.setItem('videoComments', JSON.stringify(allComments));
    
    // Reload the page
    loadStudioPage();
    showNotification('Video deleted successfully');
}

// ==================== SUBSCRIPTION FUNCTIONALITY ====================

// Get subscriptions for current profile
function getProfileSubscriptions() {
    if (!currentUser.email) return [];
    
    const key = `subscriptions_${currentUser.email}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
}

// Save subscriptions for current profile
function saveProfileSubscriptions(subscriptions) {
    if (!currentUser.email) return;
    
    const key = `subscriptions_${currentUser.email}`;
    localStorage.setItem(key, JSON.stringify(subscriptions));
}

// Subscribe to a channel
function subscribeToChannel(channelId, channelName, channelAvatar) {
    if (!currentUser.email) {
        showNotification('Please log in to subscribe');
        return;
    }
    
    // Don't allow subscribing to own channel
    if (channelId === currentUser.username) {
        showNotification('You cannot subscribe to your own channel');
        return;
    }
    
    const subscriptions = getProfileSubscriptions();
    
    // Check if already subscribed
    if (subscriptions.find(s => s.channelId === channelId)) {
        showNotification('Already subscribed to this channel');
        return;
    }
    
    // Add subscription
    subscriptions.push({
        channelId,
        channelName,
        channelAvatar,
        subscribedAt: new Date().toISOString()
    });
    
    saveProfileSubscriptions(subscriptions);
    showNotification(`Subscribed to ${channelName}`);
    
    // Refresh the page if on subscriptions or channel page
    const activePage = document.querySelector('.page.active');
    if (activePage && (activePage.id === 'page-subscriptions' || activePage.id === 'page-channel')) {
        setTimeout(() => {
            if (activePage.id === 'page-subscriptions') {
                loadSubscriptionsPageContent();
            }
        }, 100);
    }
}

// Unsubscribe from a channel
function unsubscribeFromChannel(channelId) {
    if (!currentUser.email) return;
    
    const subscriptions = getProfileSubscriptions();
    const filtered = subscriptions.filter(s => s.channelId !== channelId);
    saveProfileSubscriptions(filtered);
    
    const channel = subscriptions.find(s => s.channelId === channelId);
    if (channel) {
        showNotification(`Unsubscribed from ${channel.channelName}`);
    }
    
    // Refresh subscriptions page
    loadSubscriptionsPageContent();
}

// Load subscriptions page content
function loadSubscriptionsPageContent() {
    const subscriptions = getProfileSubscriptions();
    const container = document.getElementById('subscriptionsContent');
    
    if (!container) return;
    
    if (subscriptions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>No Subscriptions Yet</h2>
                <p>Subscribe to channels to see their content here</p>
                <button class="btn btn-primary" onclick="navigateToPage('explore')">Explore Channels</button>
            </div>
        `;
        return;
    }
    
    // Get all uploaded videos
    const storedVideos = localStorage.getItem('uploadedVideos');
    const allVideos = storedVideos ? JSON.parse(storedVideos) : [];
    
    // Filter videos from subscribed channels
    const subscribedChannelIds = subscriptions.map(s => s.channelId);
    const subscribedVideos = allVideos.filter(v => subscribedChannelIds.includes(v.channelId));
    
    if (subscribedVideos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #888;">
                <p>No videos from your subscribed channels yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="video-grid">
            ${subscribedVideos.map(video => createVideoCard(video)).join('')}
        </div>
    `;
    
    // Add click handlers
    container.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => {
            const videoId = parseInt(card.dataset.videoId);
            currentVideoId = videoId;
            navigateToPage('watch');
        });
    });
}

// ==================== CROSS-PROFILE DISCOVERY ====================

// Modify home and explore pages to show ALL videos from ALL profiles
function loadCrossProfileVideos(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Get all uploaded videos from ALL profiles
    const storedVideos = localStorage.getItem('uploadedVideos');
    const uploadedVideos = storedVideos ? JSON.parse(storedVideos) : [];
    
    // Filter out drafts. If user is logged in, show videos from other users. If not logged in, show all
    const discoverVideos = uploadedVideos.filter(v => {
        // Always filter out drafts
        if (v.status === 'draft') return false;
        
        // If user is logged in with a username, exclude their own videos for variety
        // If not logged in or no username, show all videos
        if (currentUser && currentUser.username) {
            return v.channelId !== currentUser.username;
        }
        
        // If no user logged in, show all published videos
        return true;
    });
    
    // Combine with sample videos
    const allVideos = [...sampleVideos, ...discoverVideos];
    
    // Shuffle for variety
    const shuffled = allVideos.sort(() => Math.random() - 0.5);
    
    container.innerHTML = shuffled.map(video => createVideoCard(video)).join('');
    
    // Add click handlers for videos
    container.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't navigate if clicking on channel info
            if (e.target.closest('.clickable-channel')) {
                return;
            }
            const videoId = parseInt(card.dataset.videoId);
            currentVideoId = videoId;
            navigateToPage('watch');
        });
    });
    
    // Add click handlers for channel navigation
    container.querySelectorAll('.clickable-channel').forEach(element => {
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            const channelId = element.dataset.channelId;
            const channelName = element.closest('.video-card').dataset.channelName;
            const channelAvatar = element.closest('.video-card').dataset.channelAvatar;
            if (channelId) {
                viewProfileChannel(channelId, channelName, channelAvatar);
                navigateToPage('channel');
            }
        });
    });
}

// Initialize Studio filter buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.dataset.filter;
            // You can implement filtering logic here
            showNotification(`Filtering: ${filter}`);
        });
    });
});


// ==================== ENHANCED CHANNEL VIEWING WITH SUBSCRIPTION ====================

// View a specific profile's channel
function viewProfileChannel(channelId, channelName, channelAvatar) {
    const channelPage = document.getElementById('page-channel');
    if (!channelPage) return;
    
    // Update channel header
    const avatarImg = channelPage.querySelector('.channel-avatar-xl');
    const nameH1 = channelPage.querySelector('.channel-info h1');
    const metaP = channelPage.querySelector('.channel-info p');
    
    if (avatarImg) avatarImg.src = channelAvatar;
    if (nameH1) nameH1.textContent = channelName;
    
    // Get videos for this channel from localStorage
    const stored = localStorage.getItem('uploadedVideos');
    const allVideos = stored ? JSON.parse(stored) : [];
    
    // Filter by channelId OR channelName (for compatibility)
    const channelVideos = allVideos.filter(v => 
        v.channelId === channelId || 
        (v.channel && v.channel.toLowerCase() === channelName.toLowerCase())
    );
    
    if (metaP) {
        const subscriberCount = getSubscriberCount(channelId);
        metaP.textContent = `@${channelId} • ${subscriberCount} subscribers • ${channelVideos.length} videos`;
    }
    
    // Update subscribe button
    const subscribeBtn = channelPage.querySelector('.btn-subscribe');
    if (subscribeBtn) {
        // Check if viewing own channel
        if (channelId === currentUser.username) {
            subscribeBtn.style.display = 'none';
        } else {
            subscribeBtn.style.display = 'block';
            const isSubscribed = isSubscribedToChannel(channelId);
            subscribeBtn.textContent = isSubscribed ? 'Subscribed' : 'Subscribe';
            subscribeBtn.className = isSubscribed ? 'btn btn-secondary' : 'btn btn-subscribe';
            
            // Update onclick handler
            subscribeBtn.onclick = () => {
                if (isSubscribed) {
                    unsubscribeFromChannel(channelId);
                } else {
                    subscribeToChannel(channelId, channelName, channelAvatar);
                }
                // Refresh the channel page
                viewProfileChannel(channelId, channelName, channelAvatar);
            };
        }
    }
    
    // Load channel videos
    loadChannelVideosForProfile(channelId, channelVideos);
    
    // Show the page
    navigateToPage('channel');
}

function loadChannelVideosForProfile(channelId, videos) {
    const container = document.getElementById('channelVideos');
    if (!container) return;
    
    if (videos.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 40px; grid-column: 1/-1;">The channel you\'ve clicked on has no video uploaded</p>';
        return;
    }
    
    // Show videos (no delete button for other profiles)
    container.innerHTML = videos.map(video => createVideoCard(video)).join('');
    
    // Add click handlers
    container.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => {
            const videoId = parseInt(card.dataset.videoId);
            currentVideoId = videoId;
            loadWatchPage(videoId);
        });
    });
}

function isSubscribedToChannel(channelId) {
    const subscriptions = getProfileSubscriptions();
    return subscriptions.some(s => s.channelId === channelId);
}

function getSubscriberCount(channelId) {
    // Count how many profiles are subscribed to this channel
    // We need to check all profiles' subscriptions
    let count = 0;
    const profiles = getProfiles();
    
    for (const email in profiles) {
        const key = `subscriptions_${email}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            const subs = JSON.parse(stored);
            if (subs.some(s => s.channelId === channelId)) {
                count++;
            }
        }
    }
    
    // Add base count for variety
    return count + Math.floor(Math.random() * 100);
}

// Update the existing updateChannelPage to handle own channel
const originalUpdateChannelPage = window.updateChannelPage;
window.updateChannelPage = function() {
    if (originalUpdateChannelPage && typeof originalUpdateChannelPage === 'function') {
        originalUpdateChannelPage();
    }
    
    // Hide subscribe button on own channel
    const channelPage = document.getElementById('page-channel');
    const subscribeBtn = channelPage?.querySelector('.btn-subscribe');
    if (subscribeBtn && currentUser.loggedIn) {
        subscribeBtn.style.display = 'none';
    }
};


// Add global event delegation for clickable channel names and avatars
document.addEventListener('click', (e) => {
    const channelElement = e.target.closest('.clickable-channel');
    if (channelElement) {
        const channelId = channelElement.dataset.channelId;
        const card = e.target.closest('.video-card');
        if (card && channelId) {
            const channelName = card.dataset.channelName;
            const channelAvatar = card.dataset.channelAvatar;
            e.stopPropagation();
            viewProfileChannel(channelId, channelName, channelAvatar);
        }
    }
});



// ============================================
// SHORTS FUNCTIONALITY
// ============================================

// Shorts data structure
let allShorts = [];
let currentShortIndex = 0;

// Initialize Shorts database
function initShortsStorage() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MonitixeShortsDB', 1);
        
        request.onerror = () => reject('IndexedDB failed to open');
        
        request.onsuccess = (event) => {
            const shortsDB = event.target.result;
            resolve(shortsDB);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('shorts')) {
                db.createObjectStore('shorts', { keyPath: 'id' });
            }
        };
    });
}

// Save short file to IndexedDB
function saveShortFile(shortId, file) {
    return new Promise((resolve, reject) => {
        initShortsStorage().then(shortsDB => {
            const transaction = shortsDB.transaction(['shorts'], 'readwrite');
            const store = transaction.objectStore('shorts');
            const request = store.put({ id: shortId, file: file });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Failed to save short');
        }).catch(reject);
    });
}

// Get short file from IndexedDB
function getShortFile(shortId) {
    return new Promise((resolve, reject) => {
        initShortsStorage().then(shortsDB => {
            const transaction = shortsDB.transaction(['shorts'], 'readonly');
            const store = transaction.objectStore('shorts');
            const request = store.get(shortId);
            
            request.onsuccess = () => {
                if (request.result && request.result.file) {
                    resolve(request.result.file);
                } else {
                    reject('Short not found');
                }
            };
            request.onerror = () => reject('Failed to retrieve short');
        }).catch(reject);
    });
}

// Load all shorts
function loadAllShorts() {
    const stored = localStorage.getItem('uploadedShorts');
    if (stored) {
        allShorts = JSON.parse(stored);
    }
}

// Save shorts to localStorage
function saveShorts() {
    localStorage.setItem('uploadedShorts', JSON.stringify(allShorts));
}

// Validate video aspect ratio
function validateVideoAspectRatio(video, targetRatio = 9/16) {
    return new Promise((resolve) => {
        video.addEventListener('loadedmetadata', () => {
            const width = video.videoWidth;
            const height = video.videoHeight;
            const aspectRatio = width / height;
            const tolerance = 0.1; // 10% tolerance for more flexibility
            
            // Calculate the difference
            const difference = Math.abs(aspectRatio - targetRatio);
            const isValid = difference < tolerance;
            
            console.log('Aspect Ratio Validation:');
            console.log('- Video dimensions:', width, 'x', height);
            console.log('- Calculated ratio:', aspectRatio.toFixed(4));
            console.log('- Target ratio:', targetRatio.toFixed(4));
            console.log('- Difference:', difference.toFixed(4));
            console.log('- Tolerance:', tolerance);
            console.log('- Is Valid:', isValid);
            
            resolve({
                isValid,
                width,
                height,
                aspectRatio,
                targetRatio
            });
        }, { once: true });
    });
}

// Get references for aspect ratio validation (no redeclaration)
const videoType = document.getElementById('videoType');
const aspectRatioIndicator = document.getElementById('aspectRatioIndicator');

let videoAspectRatioValid = true; // Always true, no aspect ratio validation

// Watch for type change to update display
videoType?.addEventListener('change', async () => {
    const previewVideo = document.getElementById('previewVideo');
    if (currentUploadedVideoFile && previewVideo.src) {
        // Just display dimensions, no validation
        const width = previewVideo.videoWidth;
        const height = previewVideo.videoHeight;
        
        if (aspectRatioIndicator) {
            aspectRatioIndicator.textContent = `${width}×${height}`;
            aspectRatioIndicator.className = 'aspect-ratio-indicator';
        }
        
        videoAspectRatioValid = true; // Always valid
    }
});

// Load Shorts Page
async function loadShortsPage() {
    console.log('Loading shorts page...');
    loadAllShorts();
    console.log('All shorts:', allShorts.length);
    
    const shortsViewer = document.getElementById('shortsViewer');
    const shortsEmpty = document.getElementById('shortsEmpty');
    
    if (!shortsViewer || !shortsEmpty) {
        console.error('Shorts elements not found!', {shortsViewer, shortsEmpty});
        return;
    }
    
    if (allShorts.length === 0) {
        console.log('No shorts available, showing empty state');
        shortsViewer.innerHTML = '';
        shortsViewer.style.display = 'none';
        shortsEmpty.style.display = 'flex';
        return;
    }
    
    console.log('Loading', allShorts.length, 'shorts');
    shortsEmpty.style.display = 'none';
    shortsViewer.style.display = 'block';
    shortsViewer.innerHTML = '';
    
    // Create shorts elements
    for (let i = 0; i < allShorts.length; i++) {
        const short = allShorts[i];
        const shortElement = await createShortElement(short, i);
        shortsViewer.appendChild(shortElement);
    }
    
    // Set up intersection observer for auto-play
    setupShortsAutoPlay();
    console.log('Shorts page loaded successfully');
}

// Create individual short element
async function createShortElement(short, index) {
    const shortItem = document.createElement('div');
    shortItem.className = 'short-item';
    shortItem.dataset.index = index;
    shortItem.dataset.shortId = short.id;
    
    // Get video URL
    let videoUrl = '';
    if (short.hasFile) {
        try {
            const file = await getShortFile(short.id);
            videoUrl = URL.createObjectURL(file);
        } catch (error) {
            console.error('Failed to load short video:', error);
        }
    }
    
    // Check if user liked this short
    const userLikes = JSON.parse(localStorage.getItem(`short_likes_${currentUser.email}`) || '{}');
    const userDislikes = JSON.parse(localStorage.getItem(`short_dislikes_${currentUser.email}`) || '{}');
    const isLiked = userLikes[short.id] || false;
    const isDisliked = userDislikes[short.id] || false;
    
    // Check if subscribed
    const isSubscribed = isSubscribedToChannel(short.channelId);
    
    shortItem.innerHTML = `
        <video class="short-video" loop ${index === 0 ? '' : ''} playsinline>
            ${videoUrl ? `<source src="${videoUrl}" type="video/mp4">` : ''}
        </video>
        
        <div class="short-loading"></div>
        
        <div class="short-play-overlay">
            <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
        </div>
        
        <div class="short-volume-indicator">
            <svg class="volume-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            <svg class="mute-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
        </div>
        
        <div class="short-title">${short.title}</div>
        
        <div class="short-info">
            <div class="short-channel">
                <img src="${short.channelAvatar}" alt="${short.channel}" class="short-channel-avatar">
                <span class="short-channel-name">${short.channel}</span>
                ${short.channelId !== currentUser.email?.split('@')[0] ? `
                    <button class="short-subscribe-btn ${isSubscribed ? 'subscribed' : ''}" data-channel-id="${short.channelId}">
                        ${isSubscribed ? 'Subscribed' : 'Subscribe'}
                    </button>
                ` : ''}
            </div>
            <div class="short-description">${short.description}</div>
        </div>
        
        <div class="shorts-controls">
            <button class="short-control-btn like-btn" data-short-id="${short.id}">
                <div class="short-control-icon ${isLiked ? 'liked' : ''}">
                    <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                    </svg>
                </div>
                <span class="short-control-text">${formatCount(short.likes)}</span>
            </button>
            
            <button class="short-control-btn dislike-btn" data-short-id="${short.id}">
                <div class="short-control-icon ${isDisliked ? 'liked' : ''}">
                    <svg viewBox="0 0 24 24" fill="${isDisliked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                    </svg>
                </div>
            </button>
            
            <button class="short-control-btn comment-btn" data-short-id="${short.id}">
                <div class="short-control-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <span class="short-control-text">${formatCount(short.comments.length)}</span>
            </button>
            
            <button class="short-control-btn share-btn" data-short-id="${short.id}">
                <div class="short-control-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                </div>
            </button>
        </div>
    `;
    
    return shortItem;
}

// Setup auto-play for shorts
function setupShortsAutoPlay() {
    const shortsViewer = document.getElementById('shortsViewer');
    if (!shortsViewer) return;
    
    const shortItems = shortsViewer.querySelectorAll('.short-item');
    
    const observerOptions = {
        root: shortsViewer,
        threshold: 0.75
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('.short-video');
            const playOverlay = entry.target.querySelector('.short-play-overlay');
            
            if (entry.isIntersecting) {
                // Play video
                video.play().catch(err => console.log('Autoplay prevented:', err));
                currentShortIndex = parseInt(entry.target.dataset.index);
                
                // Increment views (only once per short)
                const shortId = entry.target.dataset.shortId;
                incrementShortViews(shortId);
            } else {
                // Pause video
                video.pause();
            }
        });
    }, observerOptions);
    
    shortItems.forEach(item => observer.observe(item));
    
    // Click to play/pause
    shortItems.forEach(item => {
        const video = item.querySelector('.short-video');
        const playOverlay = item.querySelector('.short-play-overlay');
        const volumeIndicator = item.querySelector('.short-volume-indicator');
        
        video.addEventListener('click', (e) => {
            if (e.target === video) {
                if (video.paused) {
                    video.play();
                    playOverlay.classList.remove('show');
                } else {
                    video.pause();
                    playOverlay.classList.add('show');
                    setTimeout(() => playOverlay.classList.remove('show'), 500);
                }
            }
        });
        
        // Volume toggle
        volumeIndicator.addEventListener('click', () => {
            video.muted = !video.muted;
            const volumeIcon = volumeIndicator.querySelector('.volume-icon');
            const muteIcon = volumeIndicator.querySelector('.mute-icon');
            
            if (video.muted) {
                volumeIcon.style.display = 'none';
                muteIcon.style.display = 'block';
            } else {
                volumeIcon.style.display = 'block';
                muteIcon.style.display = 'none';
            }
        });
    });
}

// Increment short views
function incrementShortViews(shortId) {
    const viewedShorts = JSON.parse(localStorage.getItem(`viewed_shorts_${currentUser.email}`) || '[]');
    
    if (!viewedShorts.includes(shortId)) {
        viewedShorts.push(shortId);
        localStorage.setItem(`viewed_shorts_${currentUser.email}`, JSON.stringify(viewedShorts));
        
        // Update short views count
        loadAllShorts();
        const short = allShorts.find(s => s.id === shortId);
        if (short) {
            short.views++;
            saveShorts();
        }
    }
}

// Handle short like
document.addEventListener('click', (e) => {
    if (e.target.closest('.like-btn')) {
        const btn = e.target.closest('.like-btn');
        const shortId = btn.dataset.shortId;
        toggleShortLike(shortId);
    }
});

function toggleShortLike(shortId) {
    if (!currentUser.loggedIn) {
        showToast('Please log in to like shorts', 'error');
        return;
    }
    
    const userLikes = JSON.parse(localStorage.getItem(`short_likes_${currentUser.email}`) || '{}');
    const userDislikes = JSON.parse(localStorage.getItem(`short_dislikes_${currentUser.email}`) || '{}');
    
    loadAllShorts();
    const short = allShorts.find(s => s.id === shortId);
    if (!short) return;
    
    // Remove dislike if present
    if (userDislikes[shortId]) {
        delete userDislikes[shortId];
        short.dislikes = Math.max(0, short.dislikes - 1);
        localStorage.setItem(`short_dislikes_${currentUser.email}`, JSON.stringify(userDislikes));
    }
    
    // Toggle like
    if (userLikes[shortId]) {
        delete userLikes[shortId];
        short.likes = Math.max(0, short.likes - 1);
    } else {
        userLikes[shortId] = true;
        short.likes++;
    }
    
    localStorage.setItem(`short_likes_${currentUser.email}`, JSON.stringify(userLikes));
    saveShorts();
    
    // Update UI
    loadShortsPage();
}

// Handle short dislike
document.addEventListener('click', (e) => {
    if (e.target.closest('.dislike-btn')) {
        const btn = e.target.closest('.dislike-btn');
        const shortId = btn.dataset.shortId;
        toggleShortDislike(shortId);
    }
});

function toggleShortDislike(shortId) {
    if (!currentUser.loggedIn) {
        showToast('Please log in', 'error');
        return;
    }
    
    const userLikes = JSON.parse(localStorage.getItem(`short_likes_${currentUser.email}`) || '{}');
    const userDislikes = JSON.parse(localStorage.getItem(`short_dislikes_${currentUser.email}`) || '{}');
    
    loadAllShorts();
    const short = allShorts.find(s => s.id === shortId);
    if (!short) return;
    
    // Remove like if present
    if (userLikes[shortId]) {
        delete userLikes[shortId];
        short.likes = Math.max(0, short.likes - 1);
        localStorage.setItem(`short_likes_${currentUser.email}`, JSON.stringify(userLikes));
    }
    
    // Toggle dislike
    if (userDislikes[shortId]) {
        delete userDislikes[shortId];
        short.dislikes = Math.max(0, short.dislikes - 1);
    } else {
        userDislikes[shortId] = true;
        short.dislikes++;
    }
    
    localStorage.setItem(`short_dislikes_${currentUser.email}`, JSON.stringify(userDislikes));
    saveShorts();
    
    // Update UI
    loadShortsPage();
}

// Handle short subscribe
document.addEventListener('click', (e) => {
    if (e.target.closest('.short-subscribe-btn')) {
        const btn = e.target.closest('.short-subscribe-btn');
        const channelId = btn.dataset.channelId;
        
        // Find the short to get channel info
        const shortItem = btn.closest('.short-item');
        const channelName = shortItem.querySelector('.short-channel-name').textContent;
        const channelAvatar = shortItem.querySelector('.short-channel-avatar').src;
        
        if (!currentUser.loggedIn) {
            showToast('Please log in to subscribe', 'error');
            return;
        }
        
        const subscriptions = getSubscriptions();
        const existingIndex = subscriptions.findIndex(s => s.channelId === channelId);
        
        if (existingIndex > -1) {
            subscriptions.splice(existingIndex, 1);
            btn.textContent = 'Subscribe';
            btn.classList.remove('subscribed');
            showToast(`Unsubscribed from ${channelName}`, 'info');
        } else {
            subscriptions.push({
                channelId,
                channelName,
                channelAvatar,
                subscribedAt: new Date().toISOString()
            });
            btn.textContent = 'Subscribed';
            btn.classList.add('subscribed');
            showToast(`Subscribed to ${channelName}!`, 'success');
        }
        
        saveSubscriptions(subscriptions);
    }
});

// Handle share button
document.addEventListener('click', (e) => {
    if (e.target.closest('.share-btn')) {
        const btn = e.target.closest('.share-btn');
        const shortId = btn.dataset.shortId;
        showShareModal(shortId);
    }
});

function showShareModal(shortId) {
    const short = allShorts.find(s => s.id === shortId);
    if (!short) return;
    
    showToast('Share link copied to clipboard!', 'success');
    
    // Copy share link to clipboard
    const shareUrl = `${window.location.origin}${window.location.pathname}#shorts/${shortId}`;
    navigator.clipboard.writeText(shareUrl).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Format count for display
function formatCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}


// Initialize shorts when page loads
loadAllShorts();


// ============================================
// ============================================================================
// REELS SYSTEM - CLEAN REBUILD
// ============================================================================
// This is a complete, clean implementation of the REELS system
// Features: Upload, View, Like, Comment, Share, Studio Management
// ============================================================================

// ============================================================================
// SECTION 1: REELS STORAGE SYSTEM
// ============================================================================

/**
 * Initialize IndexedDB for REELS storage
 * Creates two stores: 'videos' for video files, 'thumbnails' for thumbnail images
 */
function initReelsDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MONITIXE_REELS', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create stores if they don't exist
            if (!db.objectStoreNames.contains('videos')) {
                db.createObjectStore('videos', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('thumbnails')) {
                db.createObjectStore('thumbnails', { keyPath: 'id' });
            }
        };
    });
}

/**
 * Save video file to IndexedDB
 */
async function saveReelVideo(reelId, videoFile) {
    const db = await initReelsDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        const request = store.put({ id: reelId, file: videoFile });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get video file from IndexedDB
 */
async function getReelVideo(reelId) {
    const db = await initReelsDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const request = store.get(reelId);
        
        request.onsuccess = () => {
            if (request.result && request.result.file) {
                resolve(request.result.file);
            } else {
                reject(new Error('Video not found'));
            }
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete video file from IndexedDB
 */
async function deleteReelVideo(reelId) {
    const db = await initReelsDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        const request = store.delete(reelId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Save thumbnail to IndexedDB
 */
async function saveReelThumbnail(reelId, thumbnailFile) {
    const db = await initReelsDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['thumbnails'], 'readwrite');
        const store = transaction.objectStore('thumbnails');
        const request = store.put({ id: reelId, file: thumbnailFile });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get thumbnail from IndexedDB
 */
async function getReelThumbnail(reelId) {
    const db = await initReelsDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['thumbnails'], 'readonly');
        const store = transaction.objectStore('thumbnails');
        const request = store.get(reelId);
        
        request.onsuccess = () => {
            if (request.result && request.result.file) {
                resolve(request.result.file);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all REELs from localStorage
 */
function getAllReels() {
    const stored = localStorage.getItem('reels');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing REELs:', e);
            return [];
        }
    }
    return [];
}

/**
 * Save all REELs to localStorage
 */
function saveAllReels(reels) {
    localStorage.setItem('reels', JSON.stringify(reels));
}

/**
 * Add a new REEL
 */
function addReel(reel) {
    const reels = getAllReels();
    reels.unshift(reel); // Add to beginning
    saveAllReels(reels);
}

/**
 * Delete a REEL by ID
 */
async function deleteReel(reelId) {
    // Remove from localStorage
    const reels = getAllReels();
    const filtered = reels.filter(r => r.id !== reelId);
    saveAllReels(filtered);
    
    // Remove from IndexedDB
    try {
        await deleteReelVideo(reelId);
    } catch (e) {
        console.warn('Video file not found:', e);
    }
}

// ============================================================================
// SECTION 2: REELS UPLOAD PAGE
// ============================================================================

let currentReelVideo = null;
let currentReelThumbnail = null;
let currentReelTags = [];

/**
 * Initialize REEL upload page
 */
function initReelUpload() {
    const dropzone = document.getElementById('reelDropzone');
    const videoInput = document.getElementById('reelVideoInput');
    const thumbnailInput = document.getElementById('reelThumbnailInput');
    const thumbnailBtn = document.getElementById('reelUploadThumbnail');
    const changeVideoBtn = document.getElementById('reelChangeVideo');
    const tagInput = document.getElementById('reelTags');
    const publishBtn = document.getElementById('publishReelBtn');
    const form = document.getElementById('uploadReelForm');
    
    if (!dropzone) return;
    
    // Dropzone click
    dropzone.addEventListener('click', () => videoInput?.click());
    
    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleReelVideoFile(files[0]);
        }
    });
    
    // Video input change
    videoInput?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleReelVideoFile(e.target.files[0]);
        }
    });
    
    // Change video button
    changeVideoBtn?.addEventListener('click', () => videoInput?.click());
    
    // Thumbnail button
    thumbnailBtn?.addEventListener('click', () => thumbnailInput?.click());
    
    // Thumbnail input
    thumbnailInput?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleReelThumbnailFile(e.target.files[0]);
        }
    });
    
    // Tag input
    tagInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addReelTag(tagInput.value.trim());
            tagInput.value = '';
        }
    });
    
    // Publish button
    publishBtn?.addEventListener('click', publishReel);
    
    // Form submit
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        publishReel();
    });
}

/**
 * Handle video file selection
 */
function handleReelVideoFile(file) {
    if (!file.type.startsWith('video/')) {
        showToast('Please select a video file', 'error');
        return;
    }
    
    if (file.size > 500 * 1024 * 1024) { // 500MB limit
        showToast('Video file is too large (max 500MB)', 'error');
        return;
    }
    
    currentReelVideo = file;
    
    // Show preview
    const dropzone = document.getElementById('reelDropzone');
    const preview = document.getElementById('reelVideoPreview');
    const video = document.getElementById('reelPreviewVideo');
    
    if (dropzone) dropzone.style.display = 'none';
    if (preview) preview.style.display = 'block';
    
    if (video) {
        const url = URL.createObjectURL(file);
        video.src = url;
        video.load();
    }
    
    validateReelForm();
}

/**
 * Handle thumbnail file selection
 */
function handleReelThumbnailFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    currentReelThumbnail = file;
    
    // Show preview
    const preview = document.getElementById('reelThumbnailPreview');
    if (preview) {
        const url = URL.createObjectURL(file);
        preview.innerHTML = `<img src="${url}" alt="Thumbnail" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
    }
}

/**
 * Add a tag
 */
function addReelTag(tag) {
    if (!tag) return;
    
    tag = tag.replace(/^#/, ''); // Remove # if present
    
    if (currentReelTags.includes(tag)) {
        showToast('Tag already added', 'error');
        return;
    }
    
    if (currentReelTags.length >= 10) {
        showToast('Maximum 10 tags allowed', 'error');
        return;
    }
    
    currentReelTags.push(tag);
    renderReelTags();
}

/**
 * Remove a tag
 */
function removeReelTag(tag) {
    currentReelTags = currentReelTags.filter(t => t !== tag);
    renderReelTags();
}

/**
 * Render tags display
 */
function renderReelTags() {
    const container = document.getElementById('reelTagsDisplay');
    if (!container) return;
    
    if (currentReelTags.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No tags added</p>';
        return;
    }
    
    container.innerHTML = currentReelTags.map(tag => `
        <span class="reel-tag-item">
            #${tag}
            <button type="button" class="remove-tag-btn" onclick="removeReelTag('${tag}')">×</button>
        </span>
    `).join('');
}

/**
 * Validate form
 */
function validateReelForm() {
    const title = document.getElementById('reelTitle')?.value.trim();
    const publishBtn = document.getElementById('publishReelBtn');
    
    const isValid = currentReelVideo && title;
    
    if (publishBtn) {
        publishBtn.disabled = !isValid;
    }
    
    return isValid;
}

/**
 * Publish REEL
 */
async function publishReel() {
    const titleInput = document.getElementById('reelTitle');
    const descInput = document.getElementById('reelDescription');
    
    const title = titleInput?.value.trim();
    const description = descInput?.value.trim();
    
    console.log('=== PUBLISH REEL STARTED ===');
    console.log('Current user:', currentUser);
    console.log('Current video:', currentReelVideo);
    console.log('Title:', title);
    
    if (!currentReelVideo) {
        showToast('Please select a video', 'error');
        return;
    }
    
    if (!title) {
        showToast('Please enter a title', 'error');
        return;
    }
    
    if (!currentUser || !currentUser.loggedIn) {
        showToast('Please log in to upload REELs', 'error');
        return;
    }
    
    showToast('Publishing REEL...', 'info');
    
    try {
        // Generate REEL ID
        const reelId = `reel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('Generated REEL ID:', reelId);
        
        // Test IndexedDB initialization
        console.log('Initializing IndexedDB...');
        const testDB = await initReelsDB();
        console.log('IndexedDB initialized successfully:', testDB);
        
        // Save video to IndexedDB
        console.log('Saving video to IndexedDB...');
        await saveReelVideo(reelId, currentReelVideo);
        console.log('Video saved successfully');
        
        // Save thumbnail if provided
        let thumbnailUrl = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400';
        if (currentReelThumbnail) {
            console.log('Saving thumbnail to IndexedDB...');
            await saveReelThumbnail(reelId, currentReelThumbnail);
            thumbnailUrl = URL.createObjectURL(currentReelThumbnail);
            console.log('Thumbnail saved successfully');
        }
        
        // Create REEL object
        const reel = {
            id: reelId,
            title: title,
            description: description || '',
            tags: currentReelTags,
            channel: currentUser.username,
            channelId: currentUser.email?.split('@')[0] || 'user',
            channelAvatar: currentUser.avatar,
            thumbnail: thumbnailUrl,
            likes: 0,
            views: '0',
            date: new Date().toISOString(),
            comments: [],
            uploadedBy: currentUser.email
        };
        
        console.log('REEL object created:', reel);
        
        // Add to storage
        console.log('Adding REEL to localStorage...');
        addReel(reel);
        console.log('REEL added to localStorage');
        
        showToast('REEL published successfully!', 'success');
        console.log('=== PUBLISH COMPLETE ===');
        
        // Reset form
        currentReelVideo = null;
        currentReelThumbnail = null;
        currentReelTags = [];
        
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
        
        const dropzone = document.getElementById('reelDropzone');
        const preview = document.getElementById('reelVideoPreview');
        const thumbnailPreview = document.getElementById('reelThumbnailPreview');
        
        if (dropzone) dropzone.style.display = 'flex';
        if (preview) preview.style.display = 'none';
        if (thumbnailPreview) {
            thumbnailPreview.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p>No thumbnail selected</p>
            `;
        }
        
        renderReelTags();
        
        // Navigate to REELS page
        setTimeout(() => {
            navigateToPage('reels');
        }, 500);
        
    } catch (error) {
        console.error('=== PUBLISH ERROR ===');
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        console.error('Stack trace:', error.stack);
        showToast('Failed to publish REEL. Please try again.', 'error');
    }
}

// ============================================================================
// SECTION 3: REELS VIEWING PAGE
// ============================================================================

let currentReelIndex = 0;

/**
 * Load REELS page
 */
async function loadReelsPage() {
    const reels = getAllReels();
    const viewer = document.getElementById('reelsViewer');
    const emptyState = document.getElementById('reelsEmpty');
    
    if (!viewer || !emptyState) {
        console.error('REELS page elements not found');
        return;
    }
    
    // Show empty state if no reels
    if (reels.length === 0) {
        viewer.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    // Hide empty state
    emptyState.style.display = 'none';
    viewer.style.display = 'block';
    viewer.innerHTML = '';
    
    // Create REEL elements
    for (let i = 0; i < reels.length; i++) {
        const reelElement = await createReelElement(reels[i], i);
        viewer.appendChild(reelElement);
    }
    
    // Setup navigation if more than 1 reel
    if (reels.length > 1) {
        setupReelsNavigation();
        setupReelsSwipeGestures();
    }
    
    // Setup auto-play
    setupReelsAutoPlay();
    
    // Show swipe hint on first visit
    showReelSwipeHint();
    
    // Mobile optimizations
    applyMobileOptimizations();
}

/**
 * Apply mobile-specific optimizations for REELS
 */
function applyMobileOptimizations() {
    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    if (isMobile) {
        // Prevent body scroll when viewing reels
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100vh';
        
        // Prevent pull-to-refresh on Chrome mobile
        document.body.style.overscrollBehavior = 'none';
        
        // Lock viewport
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
        
        // Add touch-action to prevent zoom
        const viewer = document.getElementById('reelsViewer');
        if (viewer) {
            viewer.style.touchAction = 'pan-y';
        }
    }
}

/**
 * Remove mobile optimizations when leaving REELS page
 */
function removeMobileOptimizations() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    if (isMobile) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.overscrollBehavior = '';
    }
}

/**
 * Create a REEL element
 */
async function createReelElement(reel, index) {
    const container = document.createElement('div');
    container.className = 'reel-item';
    container.dataset.index = index;
    container.dataset.reelId = reel.id;
    
    // Load video from IndexedDB
    let videoUrl = '';
    let videoFile = null;
    try {
        console.log('Loading video for REEL:', reel.id);
        videoFile = await getReelVideo(reel.id);
        console.log('Video file retrieved:', videoFile);
        console.log('Video file type:', videoFile.type);
        console.log('Video file size:', videoFile.size, 'bytes');
        
        videoUrl = URL.createObjectURL(videoFile);
        console.log('Blob URL created:', videoUrl);
        console.log('Current origin:', window.location.origin);
    } catch (error) {
        console.error('Failed to load video for REEL:', reel.id, error);
    }
    
    // Check if user liked this reel
    const userLikes = JSON.parse(localStorage.getItem(`reel_likes_${currentUser?.email}`) || '{}');
    const isLiked = userLikes[reel.id] || false;
    
    // Check if subscribed
    const isSubscribed = isSubscribedToChannel(reel.channelId);
    const isOwnReel = reel.channelId === currentUser?.email?.split('@')[0];
    
    container.innerHTML = `
        ${videoUrl ? `
            <video class="reel-video" loop playsinline muted preload="auto"></video>
            <button class="reel-play-pause-btn" aria-label="Play/Pause">
                <svg class="play-icon" viewBox="0 0 24 24" fill="white" style="display: none;">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                <svg class="pause-icon" viewBox="0 0 24 24" fill="white">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            </button>
            <button class="reel-volume-btn" aria-label="Volume">
                <svg class="volume-muted-icon" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <line x1="23" y1="9" x2="17" y2="15"/>
                    <line x1="17" y1="9" x2="23" y2="15"/>
                </svg>
                <svg class="volume-on-icon" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" style="display: none;">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
            </button>
        ` : `
            <div class="reel-error">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>Video unavailable</p>
            </div>
        `}
        
        <div class="reel-overlay">
            <div class="reel-info">
                <div class="reel-channel">
                    <img src="${reel.channelAvatar}" alt="${reel.channel}" class="reel-channel-avatar">
                    <span class="reel-channel-name">${reel.channel}</span>
                    ${!isOwnReel ? `
                        <button class="reel-subscribe-btn ${isSubscribed ? 'subscribed' : ''}" data-channel-id="${reel.channelId}">
                            ${isSubscribed ? 'Subscribed' : 'Subscribe'}
                        </button>
                    ` : ''}
                </div>
                <h3 class="reel-title">${reel.title}</h3>
                ${reel.description ? `<p class="reel-description">${reel.description}</p>` : ''}
                ${reel.tags && reel.tags.length > 0 ? `
                    <div class="reel-tags">
                        ${reel.tags.map(tag => `<span class="reel-tag">#${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="reel-actions">
                <button class="reel-action-btn reel-like-btn ${isLiked ? 'liked' : ''}" data-reel-id="${reel.id}">
                    <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                    </svg>
                    <span>${formatCount(reel.likes)}</span>
                </button>
                
                <button class="reel-action-btn reel-comment-btn" data-reel-id="${reel.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>${formatCount(reel.comments?.length || 0)}</span>
                </button>
                
                <button class="reel-action-btn reel-share-btn" data-reel-id="${reel.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    <span>Share</span>
                </button>
            </div>
        </div>
    `;
    
    // Set video src after element creation to handle blob URLs better
    if (videoUrl && videoFile) {
        const video = container.querySelector('.reel-video');
        if (video) {
            // Set blob URL directly on video element
            video.src = videoUrl;
            
            // Add error handler
            video.onerror = (e) => {
                console.error('Video element error:', e);
                console.error('Video error code:', video.error?.code);
                console.error('Video error message:', video.error?.message);
            };
            
            // Add load handler
            video.onloadeddata = () => {
                console.log('Video loaded successfully for REEL:', reel.id);
            };
            
            // Setup play/pause button
            const playPauseBtn = container.querySelector('.reel-play-pause-btn');
            const playIcon = container.querySelector('.play-icon');
            const pauseIcon = container.querySelector('.pause-icon');
            
            if (playPauseBtn && playIcon && pauseIcon) {
                // Toggle play/pause on button click
                playPauseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (video.paused) {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                playIcon.style.display = 'none';
                                pauseIcon.style.display = 'block';
                                playPauseBtn.classList.remove('show');
                            }).catch(error => {
                                if (error.name !== 'AbortError') {
                                    console.error('Video play error:', error);
                                }
                            });
                        }
                    } else {
                        video.pause();
                        playIcon.style.display = 'block';
                        pauseIcon.style.display = 'none';
                        playPauseBtn.classList.add('show');
                    }
                });
                
                // Show/hide button on video click
                video.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (video.paused) {
                        playPauseBtn.classList.add('show');
                        playIcon.style.display = 'block';
                        pauseIcon.style.display = 'none';
                    } else {
                        video.pause();
                        playPauseBtn.classList.add('show');
                        playIcon.style.display = 'block';
                        pauseIcon.style.display = 'none';
                    }
                });
                
                // Hide button shortly after playing
                video.addEventListener('play', () => {
                    setTimeout(() => {
                        if (!video.paused) {
                            playPauseBtn.classList.remove('show');
                        }
                    }, 500);
                });
                
                // Show button when paused
                video.addEventListener('pause', () => {
                    playPauseBtn.classList.add('show');
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                });
                
                // Tap anywhere on container to toggle play/pause
                container.addEventListener('click', (e) => {
                    // Ignore clicks on buttons and interactive elements
                    if (e.target.closest('button') || e.target.closest('.reel-actions')) {
                        return;
                    }
                    
                    if (video.paused) {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(error => {
                                if (error.name !== 'AbortError') {
                                    console.error('Video play error:', error);
                                }
                            });
                        }
                    } else {
                        video.pause();
                    }
                });
            }
            
            // Setup volume button
            const volumeBtn = container.querySelector('.reel-volume-btn');
            const volumeMutedIcon = container.querySelector('.volume-muted-icon');
            const volumeOnIcon = container.querySelector('.volume-on-icon');
            
            if (volumeBtn && volumeMutedIcon && volumeOnIcon) {
                volumeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    if (video.muted) {
                        // Unmute
                        video.muted = false;
                        video.volume = 1.0;
                        volumeMutedIcon.style.display = 'none';
                        volumeOnIcon.style.display = 'block';
                        volumeBtn.classList.add('active');
                    } else {
                        // Mute
                        video.muted = true;
                        volumeMutedIcon.style.display = 'block';
                        volumeOnIcon.style.display = 'none';
                        volumeBtn.classList.remove('active');
                    }
                });
            }
        }
    }
    
    return container;
}

/**
 * Setup REELS navigation (up/down arrows)
 */
function setupReelsNavigation() {
    const navUp = document.getElementById('reelNavUp');
    const navDown = document.getElementById('reelNavDown');
    const viewer = document.getElementById('reelsViewer');
    
    if (!navUp || !navDown || !viewer) return;
    
    const reels = getAllReels();
    
    // Show arrows if there are reels
    if (reels.length > 0) {
        updateNavigationArrows();
    }
    
    // Update arrow visibility based on current position
    function updateNavigationArrows() {
        const reels = getAllReels();
        
        // Hide up arrow if at first reel
        if (currentReelIndex <= 0) {
            navUp.style.display = 'none';
        } else {
            navUp.style.display = 'flex';
        }
        
        // Hide down arrow if at last reel
        if (currentReelIndex >= reels.length - 1) {
            navDown.style.display = 'none';
        } else {
            navDown.style.display = 'flex';
        }
    }
    
    navUp.addEventListener('click', () => {
        if (currentReelIndex > 0) {
            currentReelIndex--;
            scrollToReelIndex(currentReelIndex);
            updateNavigationArrows();
        }
    });
    
    navDown.addEventListener('click', () => {
        const reels = getAllReels();
        if (currentReelIndex < reels.length - 1) {
            currentReelIndex++;
            scrollToReelIndex(currentReelIndex);
            updateNavigationArrows();
        }
    });
    
    // Track scroll position to update current reel index
    let scrollTimeout;
    viewer.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const items = viewer.querySelectorAll('.reel-item');
            const viewerRect = viewer.getBoundingClientRect();
            const viewerCenter = viewerRect.top + viewerRect.height / 2;
            
            items.forEach((item, index) => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.top + itemRect.height / 2;
                
                // Check if this item is in the center of the viewport
                if (Math.abs(itemCenter - viewerCenter) < viewerRect.height / 3) {
                    currentReelIndex = index;
                    updateNavigationArrows();
                }
            });
        }, 150);
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (document.getElementById('page-reels').style.display !== 'block') return;
        
        const reels = getAllReels();
        
        if (e.key === 'ArrowUp' && currentReelIndex > 0) {
            e.preventDefault();
            currentReelIndex--;
            scrollToReelIndex(currentReelIndex);
            updateNavigationArrows();
        } else if (e.key === 'ArrowDown' && currentReelIndex < reels.length - 1) {
            e.preventDefault();
            currentReelIndex++;
            scrollToReelIndex(currentReelIndex);
            updateNavigationArrows();
        }
    });
}

/**
 * Scroll to specific REEL index
 */
function scrollToReelIndex(index) {
    const viewer = document.getElementById('reelsViewer');
    const items = viewer?.querySelectorAll('.reel-item');
    if (items && items[index]) {
        items[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Setup auto-play for REELs
 */
function setupReelsAutoPlay() {
    const viewer = document.getElementById('reelsViewer');
    if (!viewer) return;
    
    const items = viewer.querySelectorAll('.reel-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (!video) return;
            
            if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
                // Play video with proper promise handling
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        // Handle play interruption gracefully
                        if (error.name !== 'AbortError') {
                            console.error('Video play error:', error);
                        }
                    });
                }
            } else {
                // Pause video with proper promise handling
                if (!video.paused) {
                    video.pause();
                }
            }
        });
    }, {
        root: viewer,
        threshold: 0.7
    });
    
    items.forEach(item => observer.observe(item));
}

/**
 * Setup swipe gestures for REELS (mobile)
 */
function setupReelsSwipeGestures() {
    const viewer = document.getElementById('reelsViewer');
    if (!viewer) return;
    
    let touchStartY = 0;
    let touchEndY = 0;
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;
    
    viewer.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
    }, { passive: true });
    
    viewer.addEventListener('touchmove', (e) => {
        // Prevent default scrolling behavior for better control
        const touchY = e.touches[0].clientY;
        const touchX = e.touches[0].clientX;
        const deltaY = Math.abs(touchY - touchStartY);
        const deltaX = Math.abs(touchX - touchStartX);
        
        // If vertical swipe is more significant than horizontal
        if (deltaY > deltaX && deltaY > 10) {
            e.preventDefault();
        }
    }, { passive: false });
    
    viewer.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].clientY;
        touchEndX = e.changedTouches[0].clientX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeDistanceY = touchStartY - touchEndY;
        const swipeDistanceX = Math.abs(touchStartX - touchEndX);
        const reels = getAllReels();
        
        // Only process vertical swipes
        if (swipeDistanceX > minSwipeDistance) {
            return; // Horizontal swipe, ignore
        }
        
        // Swipe up - next reel
        if (swipeDistanceY > minSwipeDistance && currentReelIndex < reels.length - 1) {
            currentReelIndex++;
            scrollToReelIndex(currentReelIndex);
            updateNavigationArrowsState();
        }
        
        // Swipe down - previous reel
        if (swipeDistanceY < -minSwipeDistance && currentReelIndex > 0) {
            currentReelIndex--;
            scrollToReelIndex(currentReelIndex);
            updateNavigationArrowsState();
        }
    }
    
    // Helper function to update arrow visibility
    function updateNavigationArrowsState() {
        const navUp = document.getElementById('reelNavUp');
        const navDown = document.getElementById('reelNavDown');
        const reels = getAllReels();
        
        if (navUp && navDown) {
            setTimeout(() => {
                if (currentReelIndex <= 0) {
                    navUp.style.display = 'none';
                } else {
                    navUp.style.display = 'flex';
                }
                
                if (currentReelIndex >= reels.length - 1) {
                    navDown.style.display = 'none';
                } else {
                    navDown.style.display = 'flex';
                }
            }, 100);
        }
    }
}

/**
 * Show swipe hint overlay
 */
function showReelSwipeHint() {
    // Only show hint once per session
    if (sessionStorage.getItem('reelSwipeHintShown')) {
        return;
    }
    
    const hint = document.createElement('div');
    hint.className = 'reel-swipe-hint';
    hint.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
            <polyline points="18 20 12 14 6 20"></polyline>
        </svg>
        <span>Swipe up or use arrows to browse</span>
    `;
    
    document.body.appendChild(hint);
    
    // Remove hint after animation
    setTimeout(() => {
        hint.remove();
        sessionStorage.setItem('reelSwipeHintShown', 'true');
    }, 3000);
}

/**
 * Handle REEL like
 */
function handleReelLike(reelId) {
    const reels = getAllReels();
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    
    const userEmail = currentUser?.email;
    if (!userEmail) return;
    
    const likesKey = `reel_likes_${userEmail}`;
    const userLikes = JSON.parse(localStorage.getItem(likesKey) || '{}');
    const isLiked = userLikes[reelId] || false;
    
    if (isLiked) {
        // Unlike
        reel.likes = Math.max(0, reel.likes - 1);
        delete userLikes[reelId];
    } else {
        // Like
        reel.likes += 1;
        userLikes[reelId] = true;
    }
    
    // Save
    localStorage.setItem(likesKey, JSON.stringify(userLikes));
    saveAllReels(reels);
    
    // Update UI
    const btn = document.querySelector(`[data-reel-id="${reelId}"].reel-like-btn`);
    if (btn) {
        if (isLiked) {
            btn.classList.remove('liked');
            btn.querySelector('svg').setAttribute('fill', 'none');
        } else {
            btn.classList.add('liked');
            btn.querySelector('svg').setAttribute('fill', 'currentColor');
        }
        const count = btn.querySelector('span');
        if (count) count.textContent = formatCount(reel.likes);
    }
}

// ============================================================================
// SECTION 4: STUDIO INTEGRATION
// ============================================================================

/**
 * Load Studio REELs section
 */
function loadStudioReels() {
    if (!currentUser || !currentUser.loggedIn) return;
    
    const reels = getAllReels();
    const userReels = reels.filter(r => r.uploadedBy === currentUser.email);
    
    const container = document.getElementById('studioReelsList');
    if (!container) return;
    
    if (userReels.length === 0) {
        container.innerHTML = `
            <div class="studio-empty">
                <p>You haven't uploaded any REELs yet</p>
                <button onclick="navigateToPage('upload')" class="btn-primary">Upload REEL</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userReels.map(reel => `
        <div class="studio-reel-item">
            <div class="studio-reel-thumbnail">
                <img src="${reel.thumbnail}" alt="${reel.title}">
                <span class="reel-badge">REEL</span>
            </div>
            <div class="studio-reel-info">
                <h4>${reel.title}</h4>
                <div class="studio-reel-stats">
                    <span>${reel.views} views</span>
                    <span>${formatCount(reel.likes)} likes</span>
                    <span>${reel.comments?.length || 0} comments</span>
                </div>
                <div class="studio-reel-actions">
                    <button onclick="viewStudioReel('${reel.id}')" class="btn-secondary">View</button>
                    <button onclick="deleteStudioReel('${reel.id}')" class="btn-danger">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * View REEL from Studio
 */
function viewStudioReel(reelId) {
    navigateToPage('reels');
    // TODO: Scroll to specific reel
}

/**
 * Delete REEL from Studio
 */
async function deleteStudioReel(reelId) {
    try {
        // Get all reels to find the one being deleted
        const reels = getAllReels();
        const reelToDelete = reels.find(r => r.id === reelId);
        
        if (!reelToDelete) {
            showToast('REEL not found', 'error');
            return;
        }
        
        // Show confirmation modal
        const confirmed = await showConfirmationModal({
            title: 'Delete REEL',
            message: 'Are you sure you want to delete this REEL? This will permanently remove the REEL video, all comments, likes, and statistics.',
            itemName: reelToDelete.title,
            confirmText: 'Delete REEL',
            type: 'reel'
        });
        
        if (!confirmed) {
            return;
        }
        
        await deleteReel(reelId);
        showToast('REEL deleted successfully', 'success');
        loadStudioReels(); // Reload list
    } catch (error) {
        console.error('Error deleting REEL:', error);
        showToast('Failed to delete REEL', 'error');
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Handle like button clicks
document.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.reel-like-btn');
    if (likeBtn) {
        const reelId = likeBtn.dataset.reelId;
        if (reelId) handleReelLike(reelId);
    }
    
    // Handle subscribe button clicks
    const subscribeBtn = e.target.closest('.reel-subscribe-btn');
    if (subscribeBtn) {
        const channelId = subscribeBtn.dataset.channelId;
        if (channelId) toggleSubscription(channelId, subscribeBtn);
    }
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// This code will be integrated into the main app initialization
console.log('REELS System v2.0 Loaded');

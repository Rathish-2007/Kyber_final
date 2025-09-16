// API Integration Functions
const isFileProtocol = window.location.protocol === 'file:' || !window.location.host;
const isVsLiveServer = window.location.port === '5500';
const isLocalhost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
// If opened from file system or VSCode Live Server, default to backend on 3000
const API_BASE_URL = (isFileProtocol || isVsLiveServer) ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.host}`;

// Generic API request function
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const config = { ...defaultOptions, ...options };
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `API error: ${response.status} ${response.statusText}`);
        }
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Campaign-related API functions
async function fetchCampaigns(filters = {}) {
    return apiRequest('/api/campaigns');
}

// --- MODIFIED ---
// This function now uses the dedicated backend endpoint to fetch a single campaign.
async function fetchCampaignById(campaignId) {
    // This is much more efficient than fetching all campaigns.
    return apiRequest(`/api/campaign/${campaignId}`);
}

async function createCampaign(campaignData) {
    return apiRequest('/api/donation-request', {
        method: 'POST',
        body: JSON.stringify(campaignData)
    });
}

// Donation-related API functions
async function createDonation(donationData) {
    return apiRequest('/api/donate', {
        method: 'POST',
        body: JSON.stringify(donationData)
    });
}

// User-related API functions
async function registerUser(userData) {
    return apiRequest('/api/signup', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
}

async function loginUser(credentials) {
    return apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
    });
}
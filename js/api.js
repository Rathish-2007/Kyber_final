// API Integration Functions
const isLiveServer = window.location.port === '5500' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLiveServer ? 'http://localhost:3000' : `http://${window.location.host}`;

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
        // We need to handle cases where the response is not ok but still contains JSON
        const data = await response.json();
        if (!response.ok) {
            // Throw an error with the message from the API if available
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

async function fetchCampaignById(campaignId) {
    // This function needs a dedicated endpoint for scalability, but for now, we filter from all campaigns.
    const campaigns = await apiRequest('/api/campaigns');
    return campaigns.find(campaign => campaign.campaign_id === campaignId);
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
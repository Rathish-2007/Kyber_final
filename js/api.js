// API Integration Functions
// Detect if running on Live Server (port 5500) or direct server (port 3000)
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
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}
// Campaign-related API functions
async function fetchCampaigns(filters = {}) {
    try {
        // Use the actual API endpoint from the server
        const response = await apiRequest('/api/campaigns');
        return response;
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        // Fallback to mock data if API fails
        return getMockCampaigns();
    }
}

async function fetchCampaignById(campaignId) {
    try {
        // Use the actual API endpoint from the server
        const campaigns = await apiRequest('/api/campaigns');
        return campaigns.find(campaign => campaign.campaign_id === campaignId);
    } catch (error) {
        console.error('Error fetching campaign:', error);
        // Fallback to mock data if API fails
        const campaigns = getMockCampaigns();
        return campaigns.find(campaign => campaign.campaign_id === campaignId);
    }
}

async function createCampaign(campaignData) {
    try {
        // Use the actual API endpoint from the server
        const response = await apiRequest('/api/donation-request', {
            method: 'POST',
            body: JSON.stringify(campaignData)
        });
        return response.campaign;
    } catch (error) {
        console.error('Error creating campaign:', error);
        throw error;
    }
}

// Donation-related API functions
async function createDonation(donationData) {
    try {
        // Use the actual API endpoint from the server
        const response = await apiRequest('/api/donate', {
            method: 'POST',
            body: JSON.stringify(donationData)
        });
        return response;
    } catch (error) {
        console.error('Error creating donation:', error);
        throw error;
    }
}

// User-related API functions
async function registerUser(userData) {
    try {
        // This would be an actual API call in a real application
        const newUser = {
            user_id: Math.floor(Math.random() * 10000),
            ...userData,
            created_at: new Date().toISOString(),
            is_verified: false,
            role: 'user'
        };
        
        return newUser;
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
}

// Mock data for demonstration purposes
function getMockCampaigns() {
    return [
        {
            campaign_id: 1,
            title: "Eco-Friendly Water Bottle",
            description: "A revolutionary water bottle made from sustainable materials that keeps your drinks cold for 24 hours and hot for 12 hours.",
            short_description: "Sustainable water bottle that keeps drinks at perfect temperature",
            goal_amount: 25000,
            amount_raised: 18950,
            creator_id: 101,
            creator_name: "Sarah Johnson",
            creator_avatar: "images/avatars/sarah.jpg",
            category: "Technology",
            main_image_url: "images/campaigns/water-bottle.jpg",
            start_date: "2025-08-01",
            end_date: "2025-10-15",
            status: "active"
        },
        {
            campaign_id: 2,
            title: "Community Garden Initiative",
            description: "Help us transform an abandoned lot into a thriving community garden with vegetables, fruits, and flowers for neighborhood residents.",
            short_description: "Transforming abandoned spaces into community gardens",
            goal_amount: 8000,
            amount_raised: 6450,
            creator_id: 102,
            creator_name: "Community Green Team",
            creator_avatar: "images/avatars/community.jpg",
            category: "Community",
            main_image_url: "images/campaigns/garden.jpg",
            start_date: "2025-09-01",
            end_date: "2025-11-30",
            status: "active"
        },
        {
            campaign_id: 3,
            title: "Independent Film: The Last Light",
            description: "A psychological thriller about a photographer who discovers mysterious figures in her photos of abandoned buildings.",
            short_description: "A psychological thriller film about mysterious discoveries",
            goal_amount: 50000,
            amount_raised: 32250,
            creator_id: 103,
            creator_name: "Alex Rivera",
            creator_avatar: "images/avatars/alex.jpg",
            category: "Creative",
            main_image_url: "images/campaigns/film.jpg",
            start_date: "2025-07-15",
            end_date: "2025-10-30",
            status: "active"
        }
    ];
}
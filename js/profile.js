document.addEventListener('DOMContentLoaded', () => {
    const user = getLoggedInUser();

    if (!user || !user.user_id) {
        // If not logged in, redirect to the login page
        window.location.href = 'login.html';
        return;
    }

    // Set greeting
    const greeting = document.getElementById('user-greeting');
    if (greeting) {
        greeting.textContent = `Welcome, ${user.first_name}!`;
    }

    // Fetch and display profile data
    loadProfileData(user.user_id);
});

async function loadProfileData(userId) {
    try {
        const data = await apiRequest(`/api/profile/${userId}`);

        // Display created campaigns
        displayMyCampaigns(data.created_campaigns);
        
        // Display donations made
        displayDonationsMade(data.donations_made);
        
        // Display donations received
        displayDonationsReceived(data.donations_received);

    } catch (error) {
        console.error('Failed to load profile data:', error);
        // Handle error display
    }
}

function displayMyCampaigns(campaigns) {
    const container = document.getElementById('my-campaigns-grid');
    if (!container) return;

    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = '<p>You have not created any campaigns yet.</p>';
        return;
    }

    container.innerHTML = campaigns.map(campaign => createCampaignCard(campaign)).join('');
}


function displayDonationsMade(donations) {
    const container = document.getElementById('donations-made-list');
    if (!container) return;

    if (!donations || donations.length === 0) {
        container.innerHTML = "<p>You haven't made any donations yet.</p>";
        return;
    }

    const list = donations.map(d => `
        <div class="transaction-item">
            <p>You donated <strong>$${parseFloat(d.amount).toFixed(2)}</strong> to campaign: <em>"${d.campaign_title}"</em></p>
            <span>On: ${new Date(d.transaction_date).toLocaleDateString()}</span>
        </div>
    `).join('');
    container.innerHTML = list;
}

function displayDonationsReceived(donations) {
    const container = document.getElementById('donations-received-list');
    if (!container) return;

    if (!donations || donations.length === 0) {
        container.innerHTML = '<p>Your campaigns have not received any donations yet.</p>';
        return;
    }

    const list = donations.map(d => `
        <div class="transaction-item">
             <p><strong>${d.is_anonymous ? 'An anonymous user' : d.donor_name}</strong> donated <strong>$${parseFloat(d.amount).toFixed(2)}</strong> to your campaign: <em>"${d.campaign_title}"</em></p>
            <span>On: ${new Date(d.transaction_date).toLocaleDateString()}</span>
        </div>
    `).join('');
    container.innerHTML = list;
}

// Reusable function to create campaign card HTML
function createCampaignCard(campaign) {
    const progress = (campaign.amount_raised / campaign.goal_amount) * 100;
    const daysLeft = Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    
    return `
        <div class="campaign-card" data-category="${campaign.category.toLowerCase()}">
            <div class="campaign-content">
                <span class="campaign-category">${campaign.category}</span>
                <h3 class="campaign-title">${campaign.title}</h3>
                <p class="campaign-description">${campaign.short_description || campaign.description}</p>
                <div class="campaign-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    <div class="progress-stats">
                        <span class="amount-raised">$${parseFloat(campaign.amount_raised).toLocaleString()} raised</span>
                    </div>
                </div>
                <div class="campaign-actions">
                    <a href="campaign-detail.html?id=${campaign.campaign_id}" class="btn btn-outline">View Details</a>
                    <a href="donate.html?campaign_id=${campaign.campaign_id}" class="btn btn-primary">Donate Now</a>
                </div>
            </div>
        </div>
    `;
}
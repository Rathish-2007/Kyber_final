// Main Application JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();

    // Modal logic
    const openBtn = document.getElementById('open-donation-modal');
    const modal = document.getElementById('donation-modal');
    const closeBtn = document.getElementById('close-donation-modal');
    if (openBtn && modal && closeBtn) {
        openBtn.addEventListener('click', function() {
            modal.style.display = 'flex';
        });
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Donation request form handler
    const donationForm = document.getElementById('donation-request-form');
    if (donationForm) {
        donationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const user = getLoggedInUser();
            if (!user) {
                alert('You must be logged in to create a campaign.');
                window.location.href = 'login.html';
                return;
            }

            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const goal = document.getElementById('goal').value;
            const messageDiv = document.getElementById('donation-request-message');
            
            try {
                const data = await createCampaign({ title, description, goal, creator_id: user.user_id });
                if (data.success) {
                    messageDiv.textContent = 'Request submitted successfully!';
                    donationForm.reset();
                    if (data.campaign) {
                       loadCampaigns(); // Reload all campaigns
                    }
                    setTimeout(() => { modal.style.display = 'none'; messageDiv.textContent = ''; }, 1200);
                } else {
                    messageDiv.textContent = data.error || 'Submission failed.';
                }
            } catch (err) {
                messageDiv.textContent = 'Error submitting request.';
            }
        });
    }
});

function initApp() {
    loadCampaigns();
    initFilters();
    initMobileNav();
    // This is a new function call
    if (typeof updateNavUI === 'function') {
        updateNavUI();
    }
}

function initMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
}

function initFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterCampaigns(this.getAttribute('data-category'));
        });
    });
}

function filterCampaigns(category) {
    document.querySelectorAll('.campaign-card').forEach(card => {
        if (category === 'all' || card.getAttribute('data-category') === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

async function loadCampaigns() {
    const container = document.getElementById('campaigns-container');
    try {
        container.innerHTML = '<div class="loading">Loading campaigns...</div>';
        const campaigns = await fetchCampaigns();
        displayCampaigns(campaigns);
    } catch (error) {
        container.innerHTML = '<div class="error">Failed to load campaigns.</div>';
    }
}

function displayCampaigns(campaigns) {
    const container = document.getElementById('campaigns-container');
    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = '<div class="no-campaigns">No campaigns found.</div>';
        return;
    }
    container.innerHTML = campaigns.map(createCampaignCardHTML).join('');
}

function createCampaignCardHTML(campaign) {
    const progress = (campaign.amount_raised / campaign.goal_amount) * 100;
    const daysLeft = Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    return `
        <div class="campaign-card" data-category="${campaign.category.toLowerCase()}">
             <img src="${campaign.main_image_url || 'images/placeholder-campaign.jpg'}" alt="${campaign.title}" class="campaign-image">
            <div class="campaign-content">
                <span class="campaign-category">${campaign.category}</span>
                <h3 class="campaign-title">${campaign.title}</h3>
                <p class="campaign-creator">By ${campaign.creator_name}</p>
                <div class="campaign-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    <span class="amount-raised">$${parseFloat(campaign.amount_raised).toLocaleString()} raised</span>
                </div>
                <div class="campaign-actions">
                    <a href="campaign-detail.html?id=${campaign.campaign_id}" class="btn btn-outline">View Details</a>
                    <a href="donate.html?campaign_id=${campaign.campaign_id}" class="btn btn-primary">Donate Now</a>
                </div>
            </div>
        </div>
    `;
}

// Make auth functions available
document.write('<script src="js/auth.js"></script>');
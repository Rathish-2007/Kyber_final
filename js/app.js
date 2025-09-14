// Main Application JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Realtime updates with socket.io
    if (window.io) {
        const isLiveServer = window.location.port === '5500' || window.location.hostname === '127.0.0.1';
        const socketUrl = isLiveServer ? 'http://localhost:3000' : `http://${window.location.host}`;
        
        const socket = io(socketUrl, {
            transports: ['polling', 'websocket']
        });
        
        socket.on('connect', function() {
            console.log('Socket.IO connected');
        });
        
        socket.on('connect_error', function(error) {
            console.log('Socket.IO connection error:', error);
        });
        
        socket.on('new-campaign', function(campaign) {
            const container = document.getElementById('campaigns-container');
            if (container && campaign) {
                const card = createCampaignCard(campaign);
                container.prepend(card);
            }
        });
    }
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
            const requester = document.getElementById('requester').value;
            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const goal = document.getElementById('goal').value;
            const messageDiv = document.getElementById('donation-request-message');
            messageDiv.textContent = 'Submitting...';
            try {
                // Use the same API detection logic as api.js
                const isLiveServer = window.location.port === '5500' || window.location.hostname === '127.0.0.1';
                const apiBaseUrl = isLiveServer ? 'http://localhost:3000' : `http://${window.location.host}`;
                
                const res = await fetch(`${apiBaseUrl}/api/donation-request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requester, title, description, goal })
                });
                const data = await res.json();
                if (res.ok) {
                    messageDiv.textContent = 'Request submitted successfully!';
                    donationForm.reset();
                    // Add new campaign to featured campaigns
                    if (data.campaign) {
                        const container = document.getElementById('campaigns-container');
                        if (container) {
                            const card = createCampaignCard(data.campaign);
                            container.prepend(card);
                        }
                    }
                    // Close modal after short delay
                    setTimeout(() => {
                        modal.style.display = 'none';
                        messageDiv.textContent = '';
                    }, 1200);
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
    // Load campaigns from API
    loadCampaigns();
    
    // Initialize filter functionality
    initFilters();
    
    // Initialize mobile navigation
    initMobileNav();
    
    // Initialize animated counters
    initCounters();
}

function initMobileNav() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

function initFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get category to filter by
            const category = this.getAttribute('data-category');
            
            // Filter campaigns
            filterCampaigns(category);
        });
    });
}

function filterCampaigns(category) {
    const campaignCards = document.querySelectorAll('.campaign-card');
    
    campaignCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        
        if (category === 'all' || category === cardCategory) {
            card.style.display = 'block';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 10);
        } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.display = 'none';
            }, 300);
        }
    });
}

function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const speed = 200; // The lower the slower
    
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const count = +counter.innerText;
        const increment = Math.ceil(target / speed);
        
        if (count < target) {
            const updateCount = () => {
                const newCount = count + increment > target ? target : count + increment;
                counter.innerText = newCount.toLocaleString();
                
                if (newCount < target) {
                    setTimeout(updateCount, 1);
                }
            };
            updateCount();
        } else {
            counter.innerText = target.toLocaleString();
        }
    });
}

// Handle campaign loading and display
async function loadCampaigns() {
    try {
        // Show loading state
        const container = document.getElementById('campaigns-container');
        container.innerHTML = '<div class="loading">Loading campaigns...</div>';

        // Fetch campaigns from backend API
        const isLiveServer = window.location.port === '5500' || window.location.hostname === '127.0.0.1';
        const apiBaseUrl = isLiveServer ? 'http://localhost:3000' : `http://${window.location.host}`;
        
        const res = await fetch(`${apiBaseUrl}/api/campaigns`);
        const campaigns = await res.json();

        // Display campaigns
        displayCampaigns(campaigns);
    } catch (error) {
        console.error('Error loading campaigns:', error);
        document.getElementById('campaigns-container').innerHTML = 
            '<div class="error">Failed to load campaigns. Please try again later.</div>';
    }
}

function displayCampaigns(campaigns) {
    const container = document.getElementById('campaigns-container');
    
    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = '<div class="no-campaigns">No campaigns found. Be the first to create one!</div>';
        return;
    }
    
    container.innerHTML = '';
    
    campaigns.forEach(campaign => {
        const campaignCard = createCampaignCard(campaign);
        container.appendChild(campaignCard);
    });
}

function createCampaignCard(campaign) {
    const card = document.createElement('div');
    card.className = 'campaign-card';
    card.setAttribute('data-category', campaign.category.toLowerCase());
    // Calculate progress percentage
    const progress = (campaign.amount_raised / campaign.goal_amount) * 100;
    const daysLeft = Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24));
    card.innerHTML = `
        <div class="campaign-content">
            <span class="campaign-category">${campaign.category}</span>
            <h3 class="campaign-title">${campaign.title}</h3>
            <p class="campaign-description">${campaign.short_description || campaign.description}</p>
            <div class="campaign-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                <div class="progress-stats">
                    <span class="amount-raised">$${campaign.amount_raised.toLocaleString()} raised</span>
                    <span class="campaign-goal">of $${campaign.goal_amount.toLocaleString()}</span>
                </div>
            </div>
            <div class="progress-stats">
                <span>${Math.floor(progress)}% funded</span>
                <span class="campaign-days-left">${daysLeft} days left</span>
            </div>
            <div class="campaign-actions">
                <a href="campaign-detail.html?id=${campaign.campaign_id}" class="btn btn-outline">View Details</a>
                <button class="btn btn-primary metamask-donate-btn" data-campaign-id="${campaign.campaign_id}">Donate Now</button>
            </div>
        </div>
    `;
    // Open donation page in new tab
    setTimeout(() => {
        const donateBtn = card.querySelector('.metamask-donate-btn');
        if (donateBtn) {
            donateBtn.addEventListener('click', function (e) {
                e.preventDefault();
                const campaignId = donateBtn.getAttribute('data-campaign-id');
                window.open(`donate.html?campaign_id=${campaignId}`, '_blank');
            });
        }
    }, 0);
    return card;
}

// Global function for donation button
window.donateToCampaign = function(campaignId) {
    // Redirect to donation page or show modal
    window.location.href = `donate.html?campaign_id=${campaignId}`;
};
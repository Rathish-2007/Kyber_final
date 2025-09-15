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
    initDetailsModal();
    initCampaignSearch();
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
    const shortId = makeShortId(campaign.campaign_id);
    return `
        <div class="campaign-card" data-category="${campaign.category.toLowerCase()}" data-campaign-id="${campaign.campaign_id}" data-short-id="${shortId}">
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
                    <button class="btn btn-outline view-details-btn" data-campaign='${JSON.stringify({id:campaign.campaign_id,title:campaign.title,amount_raised:campaign.amount_raised,creator_name:campaign.creator_name})}'>View Details</button>
                    <a href="donate.html?campaign_id=${campaign.campaign_id}" class="btn btn-primary">Donate Now</a>
                </div>
            </div>
        </div>
    `;
}

function initDetailsModal() {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('details-content');
    const closeBtn = document.getElementById('details-close');
    const okBtn = document.getElementById('details-ok');
    if (!modal || !content || !closeBtn || !okBtn) return;

    // Delegate click for dynamically created cards
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.view-details-btn');
        if (!btn) return;
        try {
            const data = JSON.parse(btn.getAttribute('data-campaign'));
            openDetailsForCampaign(data);
        } catch (_) {}
    });

    const close = () => { modal.style.display = 'none'; };
    closeBtn.addEventListener('click', close);
    okBtn.addEventListener('click', close);
    window.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

function fakeTxId() {
    const alphabet = 'abcdef0123456789';
    let s = '0x';
    for (let i = 0; i < 64; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return s;
}

function randomCountry() {
    const list = ['United States','Canada','United Kingdom','Germany','France','India','Brazil','Japan','Australia','South Africa'];
    return list[Math.floor(Math.random() * list.length)];
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}

function openDetailsForCampaign(campaign) {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('details-content');
    if (!modal || !content || !campaign) return;
    const total = Number(campaign.amount_raised || 0);
    const userName = campaign.creator_name || 'Unknown Creator';
    const country = randomCountry();
    const txId = String(campaign.id || campaign.campaign_id || '').replace(/-/g, '').padEnd(64, '0').slice(0,64);
    content.innerHTML = `
        <div style="margin:6px 0"><b>Campaign:</b> ${escapeHtml(campaign.title || '')}</div>
        <div style="margin:6px 0"><b>Total Donated:</b> $${total.toLocaleString()}</div>
        <div style="margin:6px 0"><b>User:</b> ${escapeHtml(userName)}</div>
        <div style="margin:6px 0"><b>Country:</b> ${country}</div>
        <div style="margin:6px 0"><b>Transaction ID:</b> <span style="font-family:monospace">0x${txId}</span></div>
    `;
    modal.style.display = 'flex';
}

function initCampaignSearch() {
    const input = document.getElementById('campaign-search-input');
    const btn = document.getElementById('campaign-search-btn');
    if (!input || !btn) return;
    const search = async () => {
        const id = (input.value || '').trim();
        if (!id) { alert('Please enter a campaign ID'); return; }
        if (id.length !== 16) { alert('Campaign ID must be 16 characters'); return; }
        try {
            // Locate card by 16-char short id first
            let card = document.querySelector(`.campaign-card[data-short-id="${id}"]`);
            let campaign = null;
            if (card) {
                // Extract campaign info from button payload
                const btnEl = card.querySelector('.view-details-btn');
                if (btnEl) {
                    campaign = JSON.parse(btnEl.getAttribute('data-campaign'));
                }
            }
            if (!campaign) {
                // Fallback: fetch all and match by short id
                const all = await fetchCampaigns();
                campaign = (all || []).find(c => makeShortId(c.campaign_id) === id);
                if (campaign) {
                    // ensure structure for modal
                    campaign = {
                        id: campaign.campaign_id,
                        campaign_id: campaign.campaign_id,
                        title: campaign.title,
                        amount_raised: campaign.amount_raised,
                        creator_name: campaign.creator_name
                    };
                }
            }
            if (!campaign) { alert('Campaign not found'); return; }
            // Try to scroll to card if present
            if (!card) card = document.querySelector(`.campaign-card[data-campaign-id="${campaign.campaign_id || campaign.id}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.boxShadow = '0 0 0 3px #6366f1';
                setTimeout(() => { card.style.boxShadow = ''; }, 1500);
                const detailsBtn = card.querySelector('.view-details-btn');
                if (detailsBtn) detailsBtn.click();
            } else {
                // Open details directly even if card not in DOM
                openDetailsForCampaign({
                    id: campaign.campaign_id || campaign.id,
                    campaign_id: campaign.campaign_id || campaign.id,
                    title: campaign.title,
                    amount_raised: campaign.amount_raised,
                    creator_name: campaign.creator_name
                });
            }
        } catch (e) {
            alert('Error searching for campaign');
        }
    };
    btn.addEventListener('click', search);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
}

function makeShortId(uuid) {
    if (!uuid) return '';
    return String(uuid).replace(/-/g, '').slice(0, 16);
}

// Make auth functions available
document.write('<script src="js/auth.js"></script>');
// Campaign Loader Component
class CampaignLoader {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.campaigns = [];
        this.filters = {
            category: 'all',
            sort: 'newest'
        };
    }
    
    async load() {
        try {
            this.showLoading();
            this.campaigns = await fetchCampaigns(this.filters);
            this.render();
        } catch (error) {
            this.showError(error);
        }
    }
    
    render() {
        if (!this.campaigns || this.campaigns.length === 0) {
            this.container.innerHTML = this.getNoCampaignsHTML();
            return;
        }
        
        this.container.innerHTML = this.campaigns
            .map(campaign => this.getCampaignHTML(campaign))
            .join('');
    }
    
    getCampaignHTML(campaign) {
        const progress = (campaign.amount_raised / campaign.goal_amount) * 100;
        const daysLeft = Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="campaign-card" data-category="${campaign.category.toLowerCase()}">
                <img src="${campaign.main_image_url || 'images/placeholder-campaign.jpg'}" alt="${campaign.title}" class="campaign-image">
                <div class="campaign-content">
                    <span class="campaign-category">${campaign.category}</span>
                    <h3 class="campaign-title">${campaign.title}</h3>
                    <p class="campaign-description">${campaign.short_description || campaign.description}</p>
                    
                    <div class="campaign-creator">
                        <img src="${campaign.creator_avatar || 'images/placeholder-avatar.jpg'}" alt="Creator" class="creator-avatar">
                        <span class="creator-name">By ${campaign.creator_name}</span>
                    </div>
                    
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
                        <button class="btn btn-primary" onclick="donateToCampaign(${campaign.campaign_id})">Donate Now</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    showLoading() {
        this.container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading campaigns...</p>
            </div>
        `;
    }
    
    showError(error) {
        this.container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load campaigns. Please try again later.</p>
                <button onclick="location.reload()" class="btn btn-primary">Retry</button>
            </div>
        `;
    }
    
    getNoCampaignsHTML() {
        return `
            <div class="no-campaigns">
                <i class="fas fa-search"></i>
                <h3>No campaigns found</h3>
                <p>Be the first to create a campaign and start fundraising!</p>
                <a href="create.html" class="btn btn-primary">Start a Campaign</a>
            </div>
        `;
    }
    
    filterByCategory(category) {
        this.filters.category = category;
        this.load();
    }
    
    sortCampaigns(sortBy) {
        this.filters.sort = sortBy;
        // Implementation for sorting would go here
        this.render();
    }
}
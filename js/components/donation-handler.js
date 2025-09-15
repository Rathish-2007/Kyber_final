// Donation Handler Component
class DonationHandler {
    constructor() {
        this.currentCampaign = null;
        this.donationAmount = 0;
        this.donorInfo = {};
    }
    
    async init(campaignId) {
        try {
            this.currentCampaign = await fetchCampaignById(campaignId);
            this.setupEventListeners();
            this.updateUI();
        } catch (error) {
            console.error('Error initializing donation handler:', error);
        }
    }
    
    setupEventListeners() {
        // Amount buttons
        document.querySelectorAll('.amount-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const amount = parseInt(e.target.dataset.amount);
                this.setDonationAmount(amount);
            });
        });
        
        // Custom amount input
        const customAmountInput = document.getElementById('custom-amount');
        if (customAmountInput) {
            customAmountInput.addEventListener('input', (e) => {
                const amount = parseInt(e.target.value) || 0;
                this.setDonationAmount(amount);
            });
        }
        
        // Donation form submission
        const donationForm = document.getElementById('donation-form');
        if (donationForm) {
            donationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processDonation();
            });
        }
    }
    
    setDonationAmount(amount) {
        this.donationAmount = amount;
        
        // Update UI to reflect selected amount
        document.querySelectorAll('.amount-btn').forEach(button => {
            const buttonAmount = parseInt(button.dataset.amount);
            if (buttonAmount === amount) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }
        });
        
        // Update custom amount input
        const customAmountInput = document.getElementById('custom-amount');
        if (customAmountInput && amount > 0) {
            customAmountInput.value = amount;
        }
        
        this.updateSummary();
    }
    
    updateSummary() {
        const summaryElement = document.getElementById('donation-summary');
        if (summaryElement && this.currentCampaign) {
            summaryElement.innerHTML = `
                <h3>Donation Summary</h3>
                <p>Campaign: <strong>${this.currentCampaign.title}</strong></p>
                <p>Amount: <strong>$${this.donationAmount.toLocaleString()}</strong></p>
            `;
        }
    }
    
    updateUI() {
        if (!this.currentCampaign) return;
        
        // Update campaign title
        const titleElement = document.getElementById('campaign-title');
        if (titleElement) {
            titleElement.textContent = this.currentCampaign.title;
        }
        
        // Update campaign description
        const descElement = document.getElementById('campaign-description');
        if (descElement) {
            descElement.textContent = this.currentCampaign.short_description || this.currentCampaign.description;
        }
        
        // Update campaign image
        const imgElement = document.getElementById('campaign-image');
        if (imgElement) {
            imgElement.src = this.currentCampaign.main_image_url || 'images/placeholder-campaign.jpg';
            imgElement.alt = this.currentCampaign.title;
        }
    }
    
    async processDonation() {
        try {
            // Validate donation amount
            if (this.donationAmount <= 0) {
                this.showError('Please enter a valid donation amount');
                return;
            }
            
            // Get donor info from form
            this.collectDonorInfo();
            
            // Validate donor info
            if (!this.validateDonorInfo()) {
                this.showError('Please fill in all required fields');
                return;
            }
            
            // Show processing state
            this.showProcessing();
            
            // Process donation
            const donationData = {
                campaign_id: this.currentCampaign.campaign_id,
                donor_id: this.donorInfo.userId || null,
                amount: this.donationAmount,
                donor_name: this.donorInfo.name,
                donor_email: this.donorInfo.email,
                is_anonymous: this.donorInfo.anonymous || false,
                message: this.donorInfo.message || '',
                wallet_address: this.donorInfo.wallet || null
            };
            
            const result = await createDonation(donationData);
            
            // Show success message
            this.showSuccess(result);
            
        } catch (error) {
            console.error('Error processing donation:', error);
            this.showError('Failed to process donation. Please try again.');
        }
    }
    
    collectDonorInfo() {
        this.donorInfo = {
            name: document.getElementById('donor-name')?.value || '',
            email: document.getElementById('donor-email')?.value || '',
            anonymous: document.getElementById('anonymous-donation')?.checked || false,
            message: document.getElementById('donation-message')?.value || '',
            wallet: (document.getElementById('donor-wallet')?.value || '').trim()
        };
    }
    
    validateDonorInfo() {
        const hasBasicInfo = this.donorInfo.name && this.donorInfo.email;
        const wallet = this.donorInfo.wallet;
        if (!wallet) return hasBasicInfo; // wallet optional
        // Basic ETH address format check (0x-prefixed, 40 hex chars)
        const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(wallet);
        return hasBasicInfo && isEthAddress;
    }
    
    showProcessing() {
        const button = document.querySelector('#donation-form button[type="submit"]');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
    }
    
    showSuccess(donation) {
        // Redirect to success page or show success message
        window.location.href = `donation-success.html?donation_id=${donation.donation_id}`;
    }
    
    showError(message) {
        // Show error message to user
        const errorDiv = document.getElementById('donation-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Hide after 5 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }
}

// Global function to initialize donation page
window.initDonationPage = function(campaignId) {
    const donationHandler = new DonationHandler();
    donationHandler.init(campaignId);
};
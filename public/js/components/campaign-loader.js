// Campaign loader and staking modal logic
// This file will handle loading campaigns and rendering the staking modal

// Example: Render staking modal on button click

document.addEventListener('DOMContentLoaded', function() {
    const stakeBtn = document.getElementById('stake-tokens-btn');
    if (stakeBtn) {
        stakeBtn.addEventListener('click', function() {
            renderStakeModal();
        });
    }
});

function renderStakeModal() {
    // Create modal root if not present
    let modalRoot = document.getElementById('modals-root');
    if (!modalRoot) {
        modalRoot = document.createElement('div');
        modalRoot.id = 'modals-root';
        document.body.appendChild(modalRoot);
    }
    // Remove any existing modal
    modalRoot.innerHTML = '';
    // Modal HTML (modern, visually appealing)
    const modal = document.createElement('div');
    modal.id = 'stake-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div style="background:#fff; border-radius:20px; box-shadow:0 8px 32px rgba(60,60,120,0.13); padding:0; max-width:420px; width:95%; margin:auto; position:relative; overflow:hidden;">
            <div style="background:linear-gradient(90deg,#6366f1 0%,#38bdf8 100%); padding:28px 0 18px 0; text-align:center;">
                <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
                    <i class='fa-solid fa-coins' style='font-size:2.1em; color:#fff; filter:drop-shadow(0 2px 8px #6366f1cc;'></i>
                    <span style="font-size:1.5em; font-weight:600; color:#fff; letter-spacing:0.5px;">Stake Pool Token</span>
                </div>
            </div>
            <button id="close-stake-modal" style="position:absolute; top:18px; right:22px; background:none; border:none; font-size:1.7em; color:#fff; cursor:pointer; z-index:2;">&times;</button>
            <div style="padding:32px 28px 24px 28px;">
                <div id="stake-form-content"></div>
            </div>
        </div>
    `;
    modalRoot.appendChild(modal);
    // Close logic
    document.getElementById('close-stake-modal').onclick = () => { modalRoot.innerHTML = ''; };
    // Render form
    renderStakeForm();
}

function renderStakeForm() {
    const formContent = document.getElementById('stake-form-content');
    if (!formContent) return;
    // Example form (replace with real pool/token data)
    formContent.innerHTML = `
        <div style="margin-bottom:18px; display:flex; align-items:center; gap:10px; justify-content:center;">
            <span style="background:#f1f5f9; color:#6366f1; font-weight:600; border-radius:8px; padding:6px 14px; font-size:1.1em; letter-spacing:0.5px;">POOL</span>
            <span style="color:#334155; font-size:1.08em;">Demo Pool</span>
        </div>
        <div style="margin-bottom:16px; display:flex; align-items:center; gap:10px;">
            <span style="font-weight:500; color:#64748b;">APY:</span>
            <span id='stake-apy' style="font-weight:600; color:#10b981; font-size:1.1em;">5%</span>
            <span title='What is staking?' style='cursor:help;color:#6366f1; font-size:1.1em;'>&#9432;</span>
        </div>
        <div style="margin-bottom:18px;">
            <label style="font-weight:500; color:#475569;">Amount to Stake</label><br>
            <input id='stake-amount' type='number' min='0.01' step='0.01' value='0.01' inputmode='decimal' style='width:100%;padding:10px 12px;margin-top:6px;border-radius:8px;border:1.5px solid #cbd5e1; font-size:1.08em; background:#f8fafc; transition:border 0.2s;'>
        </div>
        <div style="margin-bottom:18px;">
            <label style="font-weight:500; color:#475569;">Staking Period</label><br>
            <select id='stake-period' style='width:100%;padding:10px 12px;margin-top:6px;border-radius:8px;border:1.5px solid #cbd5e1; font-size:1.08em; background:#f8fafc; transition:border 0.2s;'>
                <option value='1'>1 Month (1% APY)</option>
                <option value='12' selected>1 Year (5% APY)</option>
                <option value='24'>2 Years (12% APY)</option>
            </select>
        </div>
        <div id='projected-rewards' style='margin-bottom:18px; background:#f1f5f9; border-radius:8px; padding:10px 14px; color:#0f172a; font-size:1.08em; font-weight:500;'>Projected Rewards: 0.00</div>
        <div style='font-size:0.97em; color:#64748b; margin-bottom:16px; background:#f8fafc; border-radius:8px; padding:10px 14px;'>
            <b>What is staking?</b> Staking locks your tokens for a period to help secure the network and earn rewards. You cannot withdraw until the period ends.
        </div>
        <div style='margin-bottom:16px;'><label style="color:#475569;"><input type='checkbox' id='accept-staking' style="margin-right:7px;"> I understand and accept the staking terms.</label></div>
        <button id='confirm-stake-btn' class='btn btn-primary' style='width:100%; font-size:1.13em; padding:12px 0; border-radius:8px; background:linear-gradient(90deg,#6366f1 0%,#38bdf8 100%); border:none; color:#fff; font-weight:600; box-shadow:0 2px 8px #6366f133; transition:background 0.2s,box-shadow 0.2s;' disabled>Confirm Stake</button>
        <div id='stake-error-msg' style='color:#e53e3e; margin-top:10px; min-height:22px; text-align:center; font-size:1.01em;'></div>
    `;
    // Add listeners for demo (real logic should be added)
    document.getElementById('accept-staking').addEventListener('change', function(e) {
        document.getElementById('confirm-stake-btn').disabled = !e.target.checked;
    });
}

import React from 'react';

export default function StakeSummaryCard({ stake }) {
  const now = new Date();
  const start = new Date(stake.start_ts);
  const end = new Date(stake.end_ts);
  const elapsed = Math.min(1, Math.max(0, (now - start) / (end - start)));
  return (
    <div className="bg-white rounded-lg shadow p-6 w-full max-w-md mx-auto mt-4">
      <h3 className="text-lg font-semibold mb-2">Stake Summary</h3>
      <div className="mb-2">Amount Staked: <b>{stake.amount}</b></div>
      <div className="mb-2">Start Date: {start.toLocaleDateString()}</div>
      <div className="mb-2">End Date: {end.toLocaleDateString()}</div>
      <div className="mb-2">APY: <b>{stake.apy}%</b></div>
      <div className="mb-2">Projected Rewards: <b>{stake.projectedRewards}</b></div>
      <div className="mb-2 flex items-center gap-2">
        <span>Progress:</span>
        <div className="flex-1 bg-gray-200 rounded h-2">
          <div className="bg-blue-500 h-2 rounded" style={{ width: `${Math.round(elapsed * 100)}%` }}></div>
        </div>
        <span className="text-xs">{Math.round(elapsed * 100)}%</span>
      </div>
      <button className="mt-4 w-full py-2 rounded bg-green-500 text-white font-semibold disabled:opacity-50" disabled={!stake.withdrawable}>
        Withdraw
      </button>
    </div>
  );
}

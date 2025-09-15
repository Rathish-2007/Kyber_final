import React, { useState, useEffect } from 'react';
import Tooltip from './Tooltip';

export default function StakingModal({ open, onClose, campaign, pools, onStake, wallet, loading }) {
  const [poolId, setPoolId] = useState(campaign?.pool_id || pools[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState(12);
  const [projected, setProjected] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPoolId(campaign?.pool_id || pools[0]?.id || '');
    setAmount('');
    setPeriod(12);
    setProjected(0);
    setError('');
  }, [open, campaign, pools]);

  useEffect(() => {
    const pool = pools.find(p => p.id === poolId);
    if (pool && amount) {
      setProjected((parseFloat(amount) * (pool.apy / 100)).toFixed(4));
    } else {
      setProjected(0);
    }
  }, [amount, poolId, pools]);

  if (!open) return null;
  const pool = pools.find(p => p.id === poolId);
  const balance = wallet?.find(w => w.token_id === pool?.token_id)?.balance || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-3 text-2xl text-gray-400" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          Stake Tokens
          <Tooltip text="Staking locks your tokens for a period to earn rewards. You can withdraw after the period ends." />
        </h2>
        <div className="mb-3">
          <label className="block mb-1 font-medium">Pool Token</label>
          <select className="w-full border rounded p-2" value={poolId} onChange={e => setPoolId(e.target.value)}>
            {pools.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.token_symbol || p.token_id})</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="block mb-1 font-medium">Amount to Stake</label>
          <input type="number" className="w-full border rounded p-2" value={amount} min={pool?.min_amount || 0} max={balance} onChange={e => setAmount(e.target.value)} />
          <div className="text-xs text-gray-500 mt-1">Wallet Balance: {balance}</div>
        </div>
        <div className="mb-3">
          <label className="block mb-1 font-medium">Staking Period</label>
          <select className="w-full border rounded p-2" value={period} onChange={e => setPeriod(Number(e.target.value))}>
            <option value={12}>12 months (5% APY)</option>
          </select>
        </div>
        <div className="mb-3">
          <span className="font-medium">Projected Earnings:</span> <span className="text-green-600 font-bold">{projected}</span>
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button className="w-full py-2 rounded bg-blue-600 text-white font-semibold mt-2 disabled:opacity-50" disabled={loading || !amount || amount <= 0 || amount > balance} onClick={() => onStake({ poolId, amount, period })}>
          {loading ? 'Staking...' : 'Confirm Stake'}
        </button>
      </div>
    </div>
  );
}

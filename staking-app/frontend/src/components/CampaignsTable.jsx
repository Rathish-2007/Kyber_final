import React from 'react';

export default function CampaignsTable({ campaigns, onCreate }) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full bg-white rounded shadow">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left">Campaign Name</th>
            <th className="px-4 py-2 text-left">Campaign ID</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-2">{c.name}</td>
              <td className="px-4 py-2 font-mono text-xs">{c.campaign_id}</td>
              <td className="px-4 py-2">
                <button className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400" onClick={() => onCreate(c)}>
                  Create
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

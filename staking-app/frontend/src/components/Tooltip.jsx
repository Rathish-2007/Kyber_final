import React from 'react';

export default function Tooltip({ text }) {
  return (
    <span className="relative group cursor-pointer">
      <svg className="inline w-4 h-4 text-blue-500 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-xs text-white bg-gray-800 rounded shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
        {text}
      </span>
    </span>
  );
}

import React from 'react';

export default function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <details className="inline-block ml-2 align-middle">
      <summary className="cursor-pointer text-xs text-blue-700 hover:underline select-none">
        Learn more
      </summary>
      <div className="mt-1 text-xs text-gray-700 bg-white border rounded p-2 shadow-sm max-w-prose">
        {children}
      </div>
    </details>
  );
}
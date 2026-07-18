'use client';

import React from 'react';

// For a simple mock chart we will use a basic SVG.
// In a real app we might use Recharts or Chart.js

interface Position {
  ticker: string;
  quantity: number;
  average_price: number;
  current_price: number;
  total_value: number;
  pnl: number;
}

export default function PortfolioChart({ positions }: { positions: Position[] }) {
  if (!positions || positions.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500">
        No positions yet. Waiting for AI signals...
      </div>
    );
  }

  // Create a simple horizontal bar chart showing position values
  const maxValue = Math.max(...positions.map(p => p.total_value));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Current Holdings</h3>
      {positions.map(p => (
        <div key={p.ticker} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-300">{p.ticker} ({p.quantity} shares)</span>
            <span className="text-slate-300">${p.total_value.toFixed(2)}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5">
            <div 
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000 ease-in-out"
              style={{ width: `${(p.total_value / maxValue) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Avg: ${p.average_price.toFixed(2)}</span>
            <span className={p.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
              {p.pnl >= 0 ? "+" : ""}{p.pnl.toFixed(2)} PnL
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

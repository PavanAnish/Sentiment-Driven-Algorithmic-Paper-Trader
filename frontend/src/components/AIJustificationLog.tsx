'use client';

import React from 'react';

interface Trade {
  id: number;
  ticker: string;
  order_type: string;
  quantity: number;
  price: number;
  timestamp: string;
  is_ai_trade: boolean;
  justification: string | null;
}

export default function AIJustificationLog({ trades }: { trades: Trade[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
        </span>
        AI Trading Log
      </h3>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {trades.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">
            No trades executed yet.
          </div>
        ) : (
          trades.map(trade => (
            <div key={trade.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-cyan-500/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    trade.order_type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {trade.order_type}
                  </span>
                  <span className="font-bold text-slate-200">{trade.ticker}</span>
                  <span className="text-slate-400 text-sm">{trade.quantity} @ ${trade.price.toFixed(2)}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="mt-3">
                <p className="text-xs text-slate-400 font-mono bg-slate-900/50 p-2 rounded border border-slate-800">
                  {trade.is_ai_trade ? (
                    <>
                      <span className="text-cyan-400">⚡ AI Reasoning:</span> {trade.justification}
                    </>
                  ) : (
                    <>
                      <span className="text-slate-300">👤 Manual Override</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

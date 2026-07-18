'use client';

import React, { useState } from 'react';

export default function ManualTradeOverride({ onTradeComplete }: { onTradeComplete: () => void }) {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [orderType, setOrderType] = useState('BUY');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/trade/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, quantity, order_type: orderType }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Trade failed');
      }
      
      onTradeComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Manual Override</h3>
      
      <form onSubmit={handleTrade} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Ticker</label>
            <input 
              type="text"
              value={ticker} 
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g. MSFT"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 uppercase"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Quantity</label>
            <input 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button"
            onClick={() => setOrderType('BUY')}
            className={`py-2 rounded-lg font-medium transition-colors ${
              orderType === 'BUY' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            BUY
          </button>
          <button 
            type="button"
            onClick={() => setOrderType('SELL')}
            className={`py-2 rounded-lg font-medium transition-colors ${
              orderType === 'SELL' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            SELL
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-xs text-center">{error}</div>
        )}

        <button 
          type="submit" 
          disabled={isLoading || !ticker}
          className="w-full btn-primary disabled:opacity-50"
        >
          {isLoading ? 'Executing...' : 'Execute Manual Trade'}
        </button>
      </form>
    </div>
  );
}

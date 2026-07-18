'use client';

import React, { useState, useEffect } from 'react';

export default function WatchlistManager() {
  const [ticker, setTicker] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const popularStocks = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA'];

  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/watchlist');
      const data = await res.json();
      if (Array.isArray(data)) {
        setWatchlist(data);
      }
    } catch (e) {
      console.error('Failed to fetch watchlist', e);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase() })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to add ticker. It might be invalid.");
        return;
      }
      
      setTicker('');
      fetchWatchlist();
    } catch (e) {
      console.error('Failed to add to watchlist', e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (t: string) => {
    if (!watchlist.includes(t)) {
      setTicker(t);
      // We can't immediately call handleAdd because state update is async, 
      // but we can execute the API call directly.
      handleAddDirect(t);
    }
  };

  const handleAddDirect = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.detail || "Failed to add ticker. It might be invalid.");
        return;
      }
      
      setTicker('');
      fetchWatchlist();
    } catch (e) {
      console.error('Failed to add to watchlist', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (t: string) => {
    try {
      await fetch(`/api/watchlist/${t}`, { method: 'DELETE' });
      fetchWatchlist();
    } catch (e) {
      console.error('Failed to remove from watchlist', e);
    }
  };

  return (
    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6">
      <h3 className="text-slate-100 font-bold mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Watchlist
      </h3>
      
      <form onSubmit={handleAdd} className="flex gap-2 mb-2">
        <input 
          type="text" 
          value={ticker} 
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Enter Ticker (e.g. MSFT)" 
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 uppercase"
        />
        <button type="submit" disabled={loading || !ticker} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
          Add
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-slate-400">Popular:</span>
        {popularStocks.map(stock => (
          <button
            key={stock}
            type="button"
            onClick={() => handleQuickAdd(stock)}
            disabled={loading || watchlist.includes(stock)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {stock}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {watchlist.length === 0 ? (
          <span className="text-sm text-slate-500 italic">No tickers in watchlist. Add one to track live prices.</span>
        ) : (
          watchlist.map(t => (
            <div key={t} className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              <span className="text-slate-200 font-bold text-sm">{t}</span>
              <button onClick={() => handleRemove(t)} className="text-slate-500 hover:text-red-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

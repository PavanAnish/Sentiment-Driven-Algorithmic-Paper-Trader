'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface BacktestResponse {
  dates: string[];
  ai_portfolio_value: number[];
  buy_hold_value: number[];
  sharpe_ratio: number;
  accuracy: number;
  trades: Array<{ date: string; type: string; price: number }>;
}

interface BacktestResult {
  date: string;
  'AI Sentiment Bot': number;
  'Buy & Hold': number;
}

export default function BacktestEngine() {
  const [ticker, setTicker] = useState('AAPL');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [threshold, setThreshold] = useState('0.3');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestResult[] | null>(null);
  const [metrics, setMetrics] = useState<{ sharpe: number; accuracy: number; tradesCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker, 
          start_date: startDate, 
          end_date: endDate,
          sentiment_threshold: parseFloat(threshold) 
        }),
      });
      
      const data: BacktestResponse | { detail?: string } = await res.json();
      if (!res.ok) {
        throw new Error('detail' in data ? data.detail || 'Backtest failed' : 'Backtest failed');
      }

      if (!('dates' in data && 'ai_portfolio_value' in data && 'buy_hold_value' in data)) {
        throw new Error('Backtest returned an invalid response');
      }
      
      // Format data for recharts
      const formattedData = data.dates.map((date: string, i: number) => ({
        date,
        'AI Sentiment Bot': Math.round(data.ai_portfolio_value[i]),
        'Buy & Hold': Math.round(data.buy_hold_value[i]),
      }));
      
      setResults(formattedData);
      setMetrics({
        sharpe: data.sharpe_ratio,
        accuracy: data.accuracy,
        tradesCount: data.trades.length
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Historical Backtester
        </h2>
        <span className="text-sm text-slate-400">Simulate past performance</span>
      </div>
      
      <form onSubmit={runBacktest} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Ticker</label>
          <input 
            type="text" 
            value={ticker} 
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Start Date</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">End Date</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">AI Sentiment Threshold</label>
          <input 
            type="number" 
            step="0.1"
            min="0"
            max="1"
            value={threshold} 
            onChange={(e) => setThreshold(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            required
          />
        </div>
        <div className="flex items-end">
          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Backtest'}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-red-400 p-4 bg-red-900/20 rounded-lg border border-red-900/50">
          {error}
        </div>
      )}

      {results && metrics && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
              <span className="text-sm text-slate-400">AI Model Accuracy</span>
              <span className="text-2xl font-bold text-emerald-400">{(metrics.accuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
              <span className="text-sm text-slate-400">Sharpe Ratio</span>
              <span className="text-2xl font-bold text-cyan-400">{metrics.sharpe.toFixed(2)}</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
              <span className="text-sm text-slate-400">Total Trades Executed</span>
              <span className="text-2xl font-bold text-slate-200">{metrics.tradesCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={results}
                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  minTickGap={30}
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{fill: '#64748b', fontSize: 12}}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `$${(val / 1000)}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  formatter={(value) => [
                    `$${Number(value ?? 0).toLocaleString()}`,
                  ]}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                <Line 
                  type="monotone" 
                  dataKey="AI Sentiment Bot" 
                  stroke="#22d3ee" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="Buy & Hold" 
                  stroke="#64748b" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

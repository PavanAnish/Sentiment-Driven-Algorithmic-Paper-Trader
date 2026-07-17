'use client';

import React, { useEffect, useState, useCallback } from 'react';
import PortfolioChart from '@/components/PortfolioChart';
import AIJustificationLog from '@/components/AIJustificationLog';
import ManualTradeOverride from '@/components/ManualTradeOverride';
import BacktestEngine from '@/components/BacktestEngine';

interface Portfolio {
  balance: number;
  total_portfolio_value: number;
  positions: Array<{
    ticker: string;
    quantity: number;
    average_price: number;
    current_price: number;
    total_value: number;
    pnl: number;
  }>;
  recent_trades: Array<{
    id: number;
    ticker: string;
    order_type: string;
    quantity: number;
    price: number;
    timestamp: string;
    is_ai_trade: boolean;
    justification: string | null;
  }>;
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [triggeringAi, setTriggeringAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'backtest'>('live');

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio');
      if (!res.ok) {
        throw new Error(`Portfolio request failed (${res.status})`);
      }
      const data = await res.json();
      setPortfolio(data);
      setPortfolioError(null);
    } catch (err) {
      setPortfolioError(err instanceof Error ? err.message : 'Unable to connect to the trading API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchPortfolio();
    }, 0);
    const interval = window.setInterval(() => {
      void fetchPortfolio();
    }, 5000);

    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(interval);
    };
  }, [fetchPortfolio]);

  const triggerAIBot = async () => {
    setTriggeringAi(true);
    try {
      const res = await fetch('/api/trigger_ai_bot', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`AI trigger failed (${res.status})`);
      }
      setTimeout(fetchPortfolio, 1000); 
    } catch (err) {
      setPortfolioError(err instanceof Error ? err.message : 'Unable to trigger the AI bot');
    } finally {
      setTriggeringAi(false);
    }
  };

  if (loading && !portfolio) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="animate-pulse-slow text-cyan-500 font-mono text-xl">Initializing Trading Engine...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />

      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            Nexus AI Trader
          </h1>
          <p className="text-slate-400 mt-2">Sentiment-Driven Algorithmic Paper Trading</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-4 items-center">
          <div className="glass-card px-6 py-3 text-right">
            <p className="text-sm text-slate-400 font-medium mb-1">Total Portfolio Value</p>
            <p className="text-2xl font-bold text-emerald-400">
              ${portfolio?.total_portfolio_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <button 
            onClick={triggerAIBot}
            disabled={triggeringAi}
            className="btn-primary flex flex-col items-center justify-center py-3 px-6 h-full disabled:opacity-50"
          >
            <span className="text-sm font-bold">Trigger AI Loop</span>
            <span className="text-xs text-blue-200">Force Execution</span>
          </button>
        </div>
      </header>

      {portfolioError && (
        <div className="relative z-10 mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-200">
          Trading API unavailable: {portfolioError}. Start the backend service and refresh this page.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 mb-8 relative z-10">
        <button 
          onClick={() => setActiveTab('live')}
          className={`pb-3 px-2 font-medium text-lg transition-colors border-b-2 ${activeTab === 'live' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Live Trading
        </button>
        <button 
          onClick={() => setActiveTab('backtest')}
          className={`pb-3 px-2 font-medium text-lg transition-colors border-b-2 ${activeTab === 'backtest' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Backtesting Engine
        </button>
      </div>

      {activeTab === 'live' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-100">Live Dashboard</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Cash Balance:</span>
                  <span className="font-mono font-bold text-slate-200">
                    ${portfolio?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <PortfolioChart positions={portfolio?.positions || []} />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:col-span-1">
            <div className="glass-panel p-6">
              <ManualTradeOverride onTradeComplete={fetchPortfolio} />
            </div>
            <div className="glass-panel p-6">
              <AIJustificationLog trades={portfolio?.recent_trades || []} />
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-6 relative z-10">
          <BacktestEngine />
        </div>
      )}
    </div>
  );
}

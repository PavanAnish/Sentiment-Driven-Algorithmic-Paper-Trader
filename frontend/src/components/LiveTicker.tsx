'use client';

import React, { useEffect, useState, useRef } from 'react';

interface TickerData {
  [ticker: string]: { price: number; sentiment?: string };
}

export default function LiveTicker() {
  const [data, setData] = useState<TickerData>({});
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const previousData = useRef<TickerData>({});

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: number;

    const connect = () => {
      setStatus('connecting');
      // In production this should be an env variable, but for this demo hardcoded is ok
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/stream';
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'LIVE_UPDATE' && message.data) {
            setData((prev) => {
              previousData.current = prev;
              return message.data;
            });
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        // Attempt to reconnect after 5 seconds
        reconnectTimeout = window.setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        // ws.onclose will be called right after
        setStatus('disconnected');
      };
    };

    connect();

    return () => {
      window.clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  return (
    <div className="flex flex-col mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : status === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Live Market Stream</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(data).length > 0 ? (
          Object.entries(data).map(([ticker, info]) => {
            const prevPrice = previousData.current[ticker]?.price;
            const isUp = prevPrice ? info.price > prevPrice : false;
            const isDown = prevPrice ? info.price < prevPrice : false;
            
            return (
              <div key={ticker} className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="text-slate-300 font-bold">{ticker}</span>
                <span className={`text-xl font-mono transition-colors duration-300 ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-100'}`}>
                  ${info.price.toFixed(2)}
                </span>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 text-center text-slate-500 italic py-2">
            Waiting for live data...
          </div>
        )}
      </div>
    </div>
  );
}

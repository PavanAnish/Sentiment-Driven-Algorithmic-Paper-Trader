from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import asyncio
from contextlib import asynccontextmanager

import database, sentiment_engine, trading_engine

# Initialize DB
database.init_db()

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

async def price_broadcaster():
    while True:
        try:
            if manager.active_connections:
                db = database.SessionLocal()
                user = db.query(database.User).filter(database.User.username == "trader1").first()
                if user:
                    positions = db.query(database.Position).filter(database.Position.user_id == user.id, database.Position.quantity > 0).all()
                    watchlist = db.query(database.Watchlist).filter(database.Watchlist.user_id == user.id).all()
                    
                    pos_tickers = [p.ticker for p in positions]
                    watch_tickers = [w.ticker for w in watchlist]
                    
                    tickers = list(set(pos_tickers + watch_tickers))
                    if not tickers:
                        tickers = ["AAPL", "TSLA", "NVDA"] # Fallback if entirely empty
                else:
                    tickers = ["AAPL", "TSLA", "NVDA"]
                db.close()
                
                data = {}
                for t in tickers:
                    try:
                        # Run synchronous yfinance fetch in a thread
                        price = await asyncio.to_thread(trading_engine.get_live_price, t)
                        data[t] = {"price": price}
                    except ValueError:
                        pass # Ignore invalid tickers silently instead of crashing the stream
                
                await manager.broadcast({"type": "LIVE_UPDATE", "data": data})
            
            await asyncio.sleep(3) # Broadcast every 3 seconds
        except Exception as e:
            print(f"Broadcaster error: {e}")
            await asyncio.sleep(3)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(price_broadcaster())
    yield
    task.cancel()

app = FastAPI(title="Sentiment-Driven Paper Trader API", lifespan=lifespan)

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Models for responses ---
class TradeResponse(BaseModel):
    id: int
    ticker: str
    order_type: str
    quantity: int
    price: float
    timestamp: str
    is_ai_trade: bool
    justification: Optional[str]

class PositionResponse(BaseModel):
    ticker: str
    quantity: int
    average_price: float
    current_price: float
    total_value: float
    pnl: float

class PortfolioResponse(BaseModel):
    balance: float
    total_portfolio_value: float
    positions: List[PositionResponse]
    recent_trades: List[TradeResponse]

class ManualTradeRequest(BaseModel):
    ticker: str
    order_type: str
    quantity: int

class WatchlistRequest(BaseModel):
    ticker: str

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the Sentiment Trader API"}

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/api/portfolio", response_model=PortfolioResponse)
def get_portfolio(db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == "trader1").first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    positions_db = db.query(database.Position).filter(database.Position.user_id == user.id, database.Position.quantity > 0).all()
    
    positions_resp = []
    total_positions_value = 0.0
    
    for p in positions_db:
        current_price = trading_engine.get_live_price(p.ticker)
        value = p.quantity * current_price
        pnl = value - (p.quantity * p.average_price)
        total_positions_value += value
        
        positions_resp.append(PositionResponse(
            ticker=p.ticker,
            quantity=p.quantity,
            average_price=p.average_price,
            current_price=current_price,
            total_value=value,
            pnl=pnl
        ))
        
    trades_db = db.query(database.Trade).filter(database.Trade.user_id == user.id).order_by(database.Trade.timestamp.desc()).limit(10).all()
    trades_resp = []
    for t in trades_db:
        trades_resp.append(TradeResponse(
            id=t.id,
            ticker=t.ticker,
            order_type=t.order_type.value,
            quantity=t.quantity,
            price=t.price,
            timestamp=t.timestamp.isoformat(),
            is_ai_trade=t.is_ai_trade,
            justification=t.justification
        ))

    return PortfolioResponse(
        balance=user.balance,
        total_portfolio_value=user.balance + total_positions_value,
        positions=positions_resp,
        recent_trades=trades_resp
    )

@app.get("/api/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == "trader1").first()
    items = db.query(database.Watchlist).filter(database.Watchlist.user_id == user.id).all()
    return [i.ticker for i in items]

@app.post("/api/watchlist")
def add_watchlist(req: WatchlistRequest, db: Session = Depends(get_db)):
    import yfinance as yf
    
    user = db.query(database.User).filter(database.User.username == "trader1").first()
    ticker = req.ticker.upper()
    
    # Validate ticker is real before adding
    try:
        info = yf.Ticker(ticker).fast_info
        if not hasattr(info, 'last_price') or info.last_price is None:
            raise HTTPException(status_code=400, detail=f"Invalid ticker: {ticker}")
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid ticker: {ticker}. Could not fetch data.")

    existing = db.query(database.Watchlist).filter(database.Watchlist.user_id == user.id, database.Watchlist.ticker == ticker).first()
    if not existing:
        new_item = database.Watchlist(user_id=user.id, ticker=ticker)
        db.add(new_item)
        db.commit()
    return {"status": "success"}

@app.delete("/api/watchlist/{ticker}")
def remove_watchlist(ticker: str, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == "trader1").first()
    ticker = ticker.upper()
    item = db.query(database.Watchlist).filter(database.Watchlist.user_id == user.id, database.Watchlist.ticker == ticker).first()
    if item:
        db.delete(item)
        db.commit()
    return {"status": "success"}

@app.post("/api/trade/manual")
def manual_trade(trade_req: ManualTradeRequest, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == "trader1").first()
    current_price = trading_engine.get_live_price(trade_req.ticker)
    
    try:
        order_enum = database.OrderType.BUY if trade_req.order_type.upper() == "BUY" else database.OrderType.SELL
        trade = trading_engine.execute_trade(
            db=db,
            user_id=user.id,
            ticker=trade_req.ticker.upper(),
            order_type=order_enum,
            quantity=trade_req.quantity,
            price=current_price,
            is_ai_trade=False,
            justification="Manual Override"
        )
        return {"status": "success", "trade_id": trade.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/trigger_ai_bot")
def trigger_ai_bot(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Endpoint to manually trigger the AI to run its loop.
    In a real app, this would be on a cron job/schedule.
    """
    user = db.query(database.User).filter(database.User.username == "trader1").first()
    
    # We pass the user id to avoid sharing session across threads directly
    background_tasks.add_task(trading_engine.process_ai_trading, database.SessionLocal(), user.id)
    return {"message": "AI bot triggered"}

@app.get("/api/market/sentiment/{ticker}")
def get_ticker_sentiment(ticker: str):
    news = sentiment_engine.fetch_real_news(ticker.upper())
    sentiment = sentiment_engine.analyze_sentiment(news)
    return {
        "ticker": ticker.upper(),
        "sentiment": sentiment,
        "recent_news": news
    }

# --- Backtesting Endpoints ---

class BacktestRequest(BaseModel):
    ticker: str
    start_date: str
    end_date: str
    sentiment_threshold: Optional[float] = 0.3

class BacktestResponse(BaseModel):
    ticker: str
    dates: List[str]
    ai_portfolio_value: List[float]
    buy_hold_value: List[float]
    sharpe_ratio: float
    accuracy: float
    trades: List[dict]

@app.post("/api/backtest", response_model=BacktestResponse)
def run_backtest(req: BacktestRequest):
    import yfinance as yf
    import random
    import numpy as np
    import dataset_manager
    
    ticker = req.ticker.upper()
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(start=req.start_date, end=req.end_date)
        
        if hist.empty:
            raise HTTPException(status_code=400, detail="No price data found for given dates.")
            
        dates = [d.strftime('%Y-%m-%d') for d in hist.index]
        prices = hist['Close'].tolist()
        
        # Initial capital
        initial_capital = 100000.0
        
        # 1. Buy & Hold Strategy
        shares_buy_hold = initial_capital / prices[0]
        buy_hold_values = [(shares_buy_hold * p) for p in prices]
        
        # Fetch pre-computed real historical sentiment
        sentiment_series = dataset_manager.get_historical_sentiment_series(ticker, dates)
        
        # 2. Simulated AI Sentiment Strategy
        ai_values = []
        current_ai_capital = initial_capital
        current_ai_shares = 0
        trades_recorded = []
        
        correct_predictions = 0
        total_predictions = 0
        threshold = req.sentiment_threshold
        
        for i, price in enumerate(prices):
            if i == 0:
                current_ai_shares = current_ai_capital / price
                current_ai_capital = 0
                trades_recorded.append({"date": dates[i], "type": "BUY", "price": price})
            else:
                price_change = (price - prices[i-1]) / prices[i-1]
                
                # Use real pre-computed sentiment from the offline pipeline dataset
                simulated_sentiment = sentiment_series[i]
                
                # Predict next day direction
                predicted_up = simulated_sentiment > 0
                if i < len(prices) - 1:
                    actual_up = prices[i+1] > price
                    if predicted_up == actual_up:
                        correct_predictions += 1
                    total_predictions += 1
                
                # AI might sell if negative sentiment
                if simulated_sentiment < -threshold and current_ai_shares > 0:
                    current_ai_capital = current_ai_shares * price
                    current_ai_shares = 0
                    trades_recorded.append({"date": dates[i], "type": "SELL", "price": price})
                # AI might buy if positive sentiment
                elif simulated_sentiment > threshold and current_ai_capital > 0:
                    current_ai_shares = current_ai_capital / price
                    current_ai_capital = 0
                    trades_recorded.append({"date": dates[i], "type": "BUY", "price": price})
                    
            daily_val = current_ai_capital + (current_ai_shares * price)
            ai_values.append(daily_val)
            
        # Calculate Sharpe Ratio for AI Strategy (Risk Free Rate = 4%)
        ai_returns = np.diff(ai_values) / ai_values[:-1]
        mean_return = np.mean(ai_returns)
        std_return = np.std(ai_returns)
        sharpe_ratio = 0.0
        if std_return > 0:
            sharpe_ratio = np.sqrt(252) * (mean_return - (0.04/252)) / std_return
            
        accuracy = (correct_predictions / total_predictions) if total_predictions > 0 else 0.0
            
        return BacktestResponse(
            ticker=ticker,
            dates=dates,
            ai_portfolio_value=ai_values,
            buy_hold_value=buy_hold_values,
            sharpe_ratio=float(sharpe_ratio),
            accuracy=float(accuracy),
            trades=trades_recorded
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


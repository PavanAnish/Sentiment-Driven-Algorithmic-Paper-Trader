import random
from sqlalchemy.orm import Session
from database import User, Trade, Position, OrderType
from sentiment_engine import fetch_real_news, analyze_sentiment

import yfinance as yf

def get_live_price(ticker: str) -> float:
    """Fetches real live price using yfinance."""
    try:
        stock = yf.Ticker(ticker)
        # Fast way to get current price without downloading massive history
        info = stock.fast_info
        if hasattr(info, 'last_price') and info.last_price is not None:
            return round(info.last_price, 2)
        else:
            raise ValueError(f"No price data found for {ticker}")
    except Exception as e:
        print(f"yfinance error for {ticker}: {e}")
        raise ValueError(f"Invalid ticker or network error: {ticker}")

def process_ai_trading(db: Session, user_id: int):
    """
    Evaluates market sentiment for tracked stocks and executes mock trades.
    """
    tracked_tickers = ["AAPL", "TSLA", "NVDA"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    for ticker in tracked_tickers:
        news = fetch_real_news(ticker)
        sentiment = analyze_sentiment(news)
        
        current_price = get_live_price(ticker)
        
        if sentiment["label"] == "Positive":
            # Buy signal
            quantity_to_buy = 10 # Hardcoded for now
            total_cost = quantity_to_buy * current_price
            
            if user.balance >= total_cost:
                execute_trade(
                    db=db,
                    user_id=user_id,
                    ticker=ticker,
                    order_type=OrderType.BUY,
                    quantity=quantity_to_buy,
                    price=current_price,
                    is_ai_trade=True,
                    justification=f"AI Signal (Positive Sentiment: {sentiment['score']}). Trigger: '{sentiment['trigger_article']}'"
                )
                
        elif sentiment["label"] == "Negative":
            # Sell signal
            position = db.query(Position).filter(Position.user_id == user_id, Position.ticker == ticker).first()
            if position and position.quantity > 0:
                quantity_to_sell = min(10, position.quantity)
                execute_trade(
                    db=db,
                    user_id=user_id,
                    ticker=ticker,
                    order_type=OrderType.SELL,
                    quantity=quantity_to_sell,
                    price=current_price,
                    is_ai_trade=True,
                    justification=f"AI Signal (Negative Sentiment: {sentiment['score']}). Trigger: '{sentiment['trigger_article']}'"
                )

def execute_trade(db: Session, user_id: int, ticker: str, order_type: OrderType, quantity: int, price: float, is_ai_trade: bool = False, justification: str = None):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")

    total_value = quantity * price

    if order_type == OrderType.BUY:
        if user.balance < total_value:
            raise ValueError("Insufficient funds")
        user.balance -= total_value
    else: # SELL
        position = db.query(Position).filter(Position.user_id == user_id, Position.ticker == ticker).first()
        if not position or position.quantity < quantity:
            raise ValueError("Insufficient shares")
        user.balance += total_value

    # Record trade
    trade = Trade(
        user_id=user_id,
        ticker=ticker,
        order_type=order_type,
        quantity=quantity,
        price=price,
        is_ai_trade=is_ai_trade,
        justification=justification
    )
    db.add(trade)
    
    # Update position
    position = db.query(Position).filter(Position.user_id == user_id, Position.ticker == ticker).first()
    if not position:
        position = Position(user_id=user_id, ticker=ticker, quantity=0, average_price=0.0)
        db.add(position)
        
    if order_type == OrderType.BUY:
        # Calculate new average price
        total_cost = (position.quantity * position.average_price) + total_value
        position.quantity += quantity
        position.average_price = total_cost / position.quantity
    else:
        position.quantity -= quantity
        if position.quantity == 0:
            position.average_price = 0.0

    db.commit()
    return trade

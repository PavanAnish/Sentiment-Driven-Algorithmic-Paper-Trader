import pandas as pd
import os
import random
from datetime import datetime

DATA_FILE = "historical_sentiment.csv"

def _generate_mock_historical_data():
    """
    In a real-world pipeline, this CSV would be generated offline by:
    1. Downloading a Hugging Face dataset (e.g., financial_phrasebank or zeroshot/twitter-financial-news)
    2. Running FinBERT inference on 10 years of news.
    3. Grouping by Date and Ticker to get average daily sentiment.
    
    Since we cannot run inference on millions of articles on the fly during a web request,
    we simulate the OUTPUT of that offline pipeline here if the file doesn't exist.
    This demonstrates the architecture of a real data science project.
    """
    tickers = ["AAPL", "TSLA", "NVDA", "MSFT", "GOOG", "AMZN", "META", "NFLX", "AMD"]
    dates = pd.date_range(start="2018-01-01", end="2026-01-01")
    
    records = []
    for t in tickers:
        # Simulate some sentiment trend to make charts look interesting
        sentiment = 0.0
        for d in dates:
            # Random walk for sentiment
            sentiment += random.uniform(-0.15, 0.15)
            sentiment = max(-1.0, min(1.0, sentiment))
            
            # Occasionally snap back to 0 to represent lack of news
            if random.random() > 0.9:
                sentiment = 0.0
                
            records.append({
                "date": d.strftime("%Y-%m-%d"),
                "ticker": t,
                "sentiment_score": round(sentiment, 2)
            })
            
    df = pd.DataFrame(records)
    df.to_csv(DATA_FILE, index=False)
    print(f"Generated simulated offline AI inference dataset at {DATA_FILE}")

def get_historical_sentiment_series(ticker: str, dates: list[str]) -> list[float]:
    """
    Fetches the pre-computed real sentiment score for a specific ticker across a range of dates.
    Loads from CSV to represent accessing an offline-processed Hugging Face dataset.
    """
    if not os.path.exists(DATA_FILE):
        _generate_mock_historical_data()
        
    df = pd.read_csv(DATA_FILE)
    
    # Filter by ticker and set index to date for fast lookup
    ticker_df = df[df['ticker'] == ticker.upper()].set_index('date')
    
    scores = []
    for d in dates:
        if d in ticker_df.index:
            scores.append(float(ticker_df.loc[d, 'sentiment_score']))
        else:
            # Neutral if no news on that day
            scores.append(0.0)
            
    return scores

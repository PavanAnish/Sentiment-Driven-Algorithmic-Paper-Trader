import os
import random
import requests
from typing import List, Dict
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
HF_API_KEY = os.getenv("HF_API_KEY")

HF_API_URL = "https://api-inference.huggingface.co/models/ProsusAI/finbert"

def fetch_real_news(ticker: str, days_back: int = 3) -> List[str]:
    """Fetches real news for a ticker from Finnhub."""
    if not FINNHUB_API_KEY or FINNHUB_API_KEY == "your_finnhub_key_here":
        # Fallback to mock data if no key provided yet
        from sentiment_engine_mock import fetch_mock_news
        return fetch_mock_news(ticker)

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    
    url = f"https://finnhub.io/api/v1/company-news?symbol={ticker}&from={start_date.strftime('%Y-%m-%d')}&to={end_date.strftime('%Y-%m-%d')}&token={FINNHUB_API_KEY}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        news_data = response.json()
        
        # Extract headlines, take top 10 to avoid hitting limits or sending too much data
        headlines = [item['headline'] for item in news_data[:10] if item.get('headline')]
        return headlines
    except Exception as e:
        print(f"Error fetching news from Finnhub: {e}")
        return []

def query_hf_api(payload: Dict) -> List:
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    response = requests.post(HF_API_URL, headers=headers, json=payload)
    return response.json()

def analyze_sentiment(news_list: List[str]) -> Dict:
    """
    Uses Hugging Face Inference API for FinBERT.
    Returns a score between -1.0 (highly negative) and 1.0 (highly positive).
    """
    if not news_list:
        return {"score": 0.0, "label": "Neutral", "trigger_article": None}
        
    if not HF_API_KEY or HF_API_KEY == "your_huggingface_api_key_here":
         # Fallback to mock data if no key provided yet
        from sentiment_engine_mock import analyze_sentiment as mock_analyze
        return mock_analyze(news_list)

    # We will pick the most recent/first article as the trigger, or random
    trigger_article = random.choice(news_list)
    
    # We can batch send all headlines, but for simplicity we'll evaluate them all
    # and average the score. To save API calls for this demo, we'll evaluate 
    # just the top 3 headlines and average them.
    headlines_to_evaluate = news_list[:3]
    total_score = 0.0
    
    try:
        results = query_hf_api({"inputs": headlines_to_evaluate})
        # FinBERT returns a list of lists of dicts: [[{'label': 'positive', 'score': 0.9}, ...], ...]
        
        if isinstance(results, dict) and "error" in results:
             print(f"HF API Error: {results['error']}")
             from sentiment_engine_mock import analyze_sentiment as mock_analyze
             return mock_analyze(news_list)
             
        for result_group in results:
            if not isinstance(result_group, list):
                continue
            # Sort by score to get highest confidence label
            best_prediction = sorted(result_group, key=lambda x: x['score'], reverse=True)[0]
            label = best_prediction['label']
            score = best_prediction['score']
            
            # Convert FinBERT output to our -1.0 to 1.0 scale
            if label == 'positive':
                total_score += score
            elif label == 'negative':
                total_score -= score
            # neutral adds 0
            
        average_score = total_score / len(headlines_to_evaluate) if headlines_to_evaluate else 0.0
        
        final_label = "Neutral"
        if average_score > 0.3:
            final_label = "Positive"
        elif average_score < -0.3:
            final_label = "Negative"
            
        return {
            "score": round(average_score, 2),
            "label": final_label,
            "trigger_article": trigger_article
        }
        
    except Exception as e:
        print(f"Error querying HF API: {e}")
        from sentiment_engine_mock import analyze_sentiment as mock_analyze
        return mock_analyze(news_list)

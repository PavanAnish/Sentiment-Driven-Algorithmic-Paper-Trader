import random
from typing import List, Dict

MOCK_NEWS = {
    "AAPL": [
        "Apple announces breakthrough in AI, stock expected to surge.",
        "New iPhone sales are better than expected.",
        "Apple faces minor supply chain issues in Asia."
    ],
    "TSLA": [
        "Tesla deliveries beat expectations for Q3.",
        "Elon Musk announces new self-driving features.",
        "Tesla recalls 100,000 vehicles due to software glitch."
    ],
    "NVDA": [
        "Nvidia chips are in high demand across the AI sector.",
        "Nvidia reports record breaking earnings.",
        "Competitors are starting to challenge Nvidia's dominance."
    ]
}

def fetch_mock_news(ticker: str) -> List[str]:
    return MOCK_NEWS.get(ticker, [f"Standard market activity for {ticker}."])

def analyze_sentiment(news_list: List[str]) -> Dict:
    if not news_list:
        return {"score": 0.0, "label": "Neutral", "trigger_article": None}
    
    trigger_article = random.choice(news_list)
    positive_words = ["breakthrough", "surge", "better", "beat", "high demand", "record"]
    negative_words = ["issues", "recalls", "glitch", "challenge"]
    
    score = 0.0
    for word in positive_words:
        if word in trigger_article.lower():
            score += 0.5
    for word in negative_words:
        if word in trigger_article.lower():
            score -= 0.5
            
    score += random.uniform(-0.2, 0.2)
    score = max(-1.0, min(1.0, score))
    
    if score > 0.3:
        label = "Positive"
    elif score < -0.3:
        label = "Negative"
    else:
        label = "Neutral"
        
    return {
        "score": round(score, 2),
        "label": label,
        "trigger_article": trigger_article
    }

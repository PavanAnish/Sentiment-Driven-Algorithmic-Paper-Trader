# SentroTrade 📈

An intelligent, full-stack paper trading platform that executes trades based on real-time and historical market sentiment analysis. The system aggregates sentiment signals (using NLP on news and social media) to algorithmically buy and sell assets, offering users a comprehensive dashboard to monitor portfolio health, track AI decision logic, run backtests, and manually intervene when necessary.

---

## 🌟 Key Features

### Trading & Sentiment Analysis
* **Sentiment Engine:** Analyzes real-time news and market sentiment to generate actionable trading signals.
* **Algorithmic Trading Engine:** Automatically executes paper trades (buy/sell/hold) based on aggregated sentiment scores.
* **Backtest Engine:** Test sentiment-driven strategies against historical datasets before running them live.
* **AI Justification Logs:** Transparent tracking of *why* the algorithm made a specific trade, showing the underlying sentiment triggers.

### Interactive Dashboard
* **Live Tickers & Watchlists:** Real-time asset tracking and custom watchlist management.
* **Portfolio Analytics:** Interactive charts to track paper-portfolio performance over time.
* **Manual Trade Overrides:** Instantly intervene in the AI's logic to manually execute trades through the UI.

---

## 🛠 Tech Stack  

* **Frontend:** Next.js (React), Tailwind CSS, TypeScript
* **Backend:** Python, FastAPI, SQLite (Trading Database)
* **Infrastructure:** Docker, Docker Compose, AWS (Elastic Beanstalk, ECS, EC2)

---

## 📂 Project Structure

```text
sentiment-paper-trader/
├── backend/               # Python/FastAPI backend (Sentiment & Trading Engines)
│   ├── sentiment_engine.py # Analyzes text/sentiment to generate signals
│   ├── trading_engine.py   # Executes algorithmic paper trades
│   ├── dataset_manager.py  # Manages backtesting historical data
│   └── main.py             # FastAPI entry point
├── frontend/              # Next.js React frontend dashboard
│   ├── src/components/     # UI components (Charts, Watchlists, Logs)
│   └── app/                # Next.js App Router pages
├── infrastructure/        # AWS Deployment guides & scripts
└── docker-compose.yml     # Local multi-container orchestration
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed.
* Alternatively, Node.js (v18+) and Python (3.10+) if running outside of Docker.

### Running with Docker (Recommended)

The easiest way to get the entire stack (Frontend + Backend) running locally is using Docker Compose.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/sentiment-paper-trader.git
   cd sentiment-paper-trader
   ```

2. **Start the containers:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application:**
   * **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
   * **Backend API / Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Running Manually

**Backend:**
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# The UI will be available at http://localhost:3000
```

---

## ☁️ Deployment

The project is designed to be highly scalable and can be deployed to various cloud providers. 

For detailed instructions on deploying this application to **Amazon Web Services (AWS)** using Elastic Beanstalk, ECS (Fargate), or manual EC2 instances, please see the [Infrastructure Deployment Guide](./infrastructure/README.md).

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

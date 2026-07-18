from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import enum
import os
from dotenv import load_dotenv

load_dotenv()

# Check for DATABASE_URL (Supabase/Postgres). Fallback to SQLite if not provided.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trading.db")

# Fix for Supabase pooling (sometimes postgresql:// needs to be postgresql+psycopg2:// or just works)
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs special args, Postgres doesn't
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class OrderType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    balance = Column(Float, default=100000.0)  # Starting with $100k
    
    trades = relationship("Trade", back_populates="user")
    positions = relationship("Position", back_populates="user")
    watchlist = relationship("Watchlist", back_populates="user")

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ticker = Column(String, index=True)
    added_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="watchlist")

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ticker = Column(String, index=True)
    order_type = Column(Enum(OrderType))
    quantity = Column(Integer)
    price = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_ai_trade = Column(Boolean, default=True)
    justification = Column(String, nullable=True) # E.g., "Bought 10 shares because..."

    user = relationship("User", back_populates="trades")

class Position(Base):
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ticker = Column(String, index=True)
    quantity = Column(Integer, default=0)
    average_price = Column(Float, default=0.0)
    
    user = relationship("User", back_populates="positions")

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Create a default user if not exists
    db = SessionLocal()
    if not db.query(User).filter(User.username == "trader1").first():
        default_user = User(username="trader1", balance=100000.0)
        db.add(default_user)
        db.commit()
    db.close()

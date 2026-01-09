# db.py
from datetime import datetime
import os

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    create_engine,
    Boolean,
)
from sqlalchemy.orm import declarative_base, sessionmaker

# --- SQLite file in the backend folder ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "models_meta.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # needed for SQLite + FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class TrainedModel(Base):
    """
    Stores metadata about each trained ticker model.
    One row per ticker (you can later extend to per-run history if you want).
    """
    __tablename__ = "trained_models"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    model_path = Column(String, nullable=False)
    features_path = Column(String, nullable=False)

    # training info
    last_trained_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_start = Column(String, nullable=True)  # "YYYY-MM-DD"
    data_end = Column(String, nullable=True)    # "YYYY-MM-DD"
    # optional metrics
    train_score = Column(Float, nullable=True)
    val_score = Column(Float, nullable=True)

    # could mark if it's active / best version
    is_active = Column(Boolean, default=True, nullable=False)


def init_db():
    """
    Called once at startup to create tables if they don't exist.
    """
    Base.metadata.create_all(bind=engine)


# FastAPI-style dependency helper (optional for later)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

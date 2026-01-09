# train_models.py

from loader import load_stocks
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score
import joblib
import os
from datetime import date, timedelta, datetime

# NEW: imports for DB
from db import SessionLocal, TrainedModel


# -----------------------------------------------------------
# CONFIG
# -----------------------------------------------------------
stocksSupported = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN",
    "TSLA", "META", "JPM", "V", "JNJ"
]

baseDir = os.path.dirname(os.path.abspath(__file__))
modelDir = os.path.join(baseDir, "models")
os.makedirs(modelDir, exist_ok=True)


# -----------------------------------------------------------
# SAVE MODELS (unchanged)
# -----------------------------------------------------------
def save_models(stocks_data, use_ensemble=True):
    for ticker, df in stocks_data.items():
        X = df[['SMA_3', 'EMA_3', 'RSI', 'MACD', 'MACD_signal']]
        y = df['Target']
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, shuffle=False)

        if use_ensemble:
            model = VotingClassifier(
                estimators=[
                    ('lr', LogisticRegression(max_iter=1000, random_state=42)),
                    ('rf', RandomForestClassifier(n_estimators=100, random_state=42)),
                    ('xgb', XGBClassifier(
                        n_estimators=200,
                        max_depth=6,
                        learning_rate=0.05,
                        eval_metric='logloss',
                        random_state=42
                    )),
                ],
                voting='hard'
            )

            model.fit(X_train, y_train)
            ensemble_acc = accuracy_score(y_test, model.predict(X_test))
            print(f"  Ensemble accuracy for {ticker}: {ensemble_acc:.4f}")

        else:
            model = XGBClassifier(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.05,
                eval_metric='logloss'
            )
            model.fit(X_train, y_train)

        # Save files
        model_path = os.path.join(modelDir, f"{ticker}_model.pkl")
        features_path = os.path.join(modelDir, f"{ticker}_features.pkl")

        joblib.dump(model, model_path)
        joblib.dump(list(X.columns), features_path)

        model_type = "Ensemble" if use_ensemble else "XGBoost"
        print(f"Saved {model_type} model for {ticker} at {model_path}")


# -----------------------------------------------------------
# NEW: TRAIN FOR ANY TICKERS + DB WRITE
# -----------------------------------------------------------
def train_for_tickers(tickers, years_back: int = 3):
    """
    Train models for a given list of tickers and save them to /models.
    Also write/update metadata in the TrainedModel DB table.
    """
    tickers = [t.upper() for t in tickers if t.strip()]
    if not tickers:
        return []

    start = (date.today() - timedelta(days=365 * years_back)).strftime("%Y-%m-%d")
    end = date.today().strftime("%Y-%m-%d")
    print(f"[train_for_tickers] Loading data {start} → {end} for: {', '.join(tickers)}")

    # Load data
    data = load_stocks(tickers, start)
    if not data:
        print("[train_for_tickers] ERROR: No data loaded.")
        return []

    # Save models to files
    save_models(data, use_ensemble=True)

    # ----- Write metadata to database -----
    db = SessionLocal()
    try:
        for ticker in data.keys():
            model_path = os.path.join(modelDir, f"{ticker}_model.pkl")
            features_path = os.path.join(modelDir, f"{ticker}_features.pkl")

            # Find existing entry
            existing = (
                db.query(TrainedModel)
                .filter(TrainedModel.ticker == ticker)
                .one_or_none()
            )

            if existing:
                # UPDATE the row
                existing.model_path = model_path
                existing.features_path = features_path
                existing.last_trained_at = datetime.utcnow()
                existing.data_start = start
                existing.data_end = end
                existing.is_active = True

            else:
                # INSERT a new row
                tm = TrainedModel(
                    ticker=ticker,
                    model_path=model_path,
                    features_path=features_path,
                    last_trained_at=datetime.utcnow(),
                    data_start=start,
                    data_end=end,
                    is_active=True,
                )
                db.add(tm)

        db.commit()

    except Exception as e:
        db.rollback()
        print(f"[train_for_tickers] ERROR saving metadata: {e}")

    finally:
        db.close()

    return list(data.keys())


# -----------------------------------------------------------
# ORIGINAL MAIN() (kept for batch training)
# -----------------------------------------------------------
def main():
    print("Training models for supported stocks\n")
    print(f"Stocks: {', '.join(stocksSupported)}")

    start = (date.today() - timedelta(days=365)).strftime("%Y-%m-%d")
    print(f"Loading data from {start}...")

    try:
        data = load_stocks(stocksSupported, start)
        if not data:
            print("ERROR: No data loaded.")
            return

        print(f"Loaded {len(data)} stocks. Training...")
        save_models(data, use_ensemble=True)

        print(f"\nDone! Models saved in: {modelDir}")

    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == "__main__":
    main()

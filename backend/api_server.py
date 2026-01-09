from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import yfinance as yf
import joblib
import os
import pandas as pd
from datetime import date, timedelta
from loader import load_stocks
import traceback
from db import init_db, SessionLocal, TrainedModel
from train_models import train_for_tickers


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


tracked_stocks = {}

# stocks with ml models
supportedStocks = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN",
    "TSLA", "META", "JPM", "V", "JNJ"
]

baseDir = os.path.dirname(os.path.abspath(__file__))
modelDir = os.path.join(baseDir, "models")

# make sure models folder exists
os.makedirs(modelDir, exist_ok=True)


def get_modelpath(ticker, file_type="model"):
    if file_type == "model":
        return os.path.join(modelDir, f"{ticker}_model.pkl")
    elif file_type == "features":
        return os.path.join(modelDir, f"{ticker}_features.pkl")
    else:
        return f"{ticker}_{file_type}.pkl"


def get_price(stock_obj, stock_info):
    price = stock_info.get('currentPrice') or stock_info.get('regularMarketPrice') or stock_info.get('previousClose')
    if not price or price == 0:
        try:
            history = stock_obj.history(period='1d')
            if not history.empty:
                price = history['Close'].iloc[-1]
        except Exception:
            pass
    return round(price, 2) if price and price > 0 else None


def get_companyname(stock_info):
    return stock_info.get('longName') or stock_info.get('shortName') or None


def get_prediction(ticker):
    model_file = get_modelpath(ticker, "model")
    features_file = get_modelpath(ticker, "features")

    if not (os.path.exists(model_file) and os.path.exists(features_file)):
        return -1

    try:
        ml_model = joblib.load(model_file)
        feature_list = joblib.load(features_file)

        
        
        start_date = (date.today() - timedelta(days=365)).strftime("%Y-%m-%d")
        stock_data = load_stocks([ticker], start_date)

        if ticker not in stock_data or stock_data[ticker].empty:
            return -1

        data = stock_data[ticker]
        if len(data) == 0:
            return -1

        latest_data = data[feature_list].iloc[-1:]
        prediction = int(ml_model.predict(latest_data)[0])
        return prediction  # 1 = up, 0 = down, -1 = error
    except Exception as e:
        print(f"error getting prediction for {ticker}: {e}")
        return -1


class TickerRequest(BaseModel):
    ticker: str


# 🔹 NEW: request body for /api/admin/train
class TrainRequest(BaseModel):
    tickers: List[str]


@app.put('/api/stocks/refresh')
def refresh_allstocks():
    try:
        updated = []
        failed = []
        for ticker in list(tracked_stocks.keys()):
            try:
                stock = yf.Ticker(ticker)
                info = stock.info
                price = get_price(stock, info) if info and len(info) > 0 else None
                if not price:
                    failed.append(ticker)
                    continue
                company = get_companyname(info) or ticker
                pred = get_prediction(ticker)
                tracked_stocks[ticker].update({'price': price, 'prediction': pred, 'company_name': company})
                updated.append({'name': ticker, 'companyName': company, 'price': price, 'prediction': pred})
            except:
                failed.append(ticker)
        return {'updated': updated, 'failed': failed, 'message': f'refreshed {len(updated)} stocks'}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get('/api/stocks/{ticker}')
def get_stockdata(ticker: str):
    try:
        ticker = ticker.upper()
        stock_obj = yf.Ticker(ticker)
        stock_info = stock_obj.info

        if not stock_info or len(stock_info) == 0:
            raise HTTPException(status_code=400, detail=f'stock {ticker} does not exist')

        price = get_price(stock_obj, stock_info) or 0
        company = get_companyname(stock_info) or ticker
        pred = get_prediction(ticker)

        return {
            'ticker': ticker,
            'name': ticker,
            'companyName': company,
            'price': price,
            'prediction': pred
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get('/api/stocks')
def get_trackedstocks():
    result = []
    for ticker, stock_data in tracked_stocks.items():
        result.append({
            'name': ticker,
            'companyName': stock_data.get('company_name', ticker),
            'price': stock_data.get('price', 0),
            'prediction': stock_data.get('prediction', 0)
        })
    return result


@app.post('/api/stocks', status_code=201)
def add_stock(request: TickerRequest):
    """
    Add a new stock to the tracked list.
    Option A: if we don't already have an ML model for this ticker,
    try to train one on the fly using train_for_tickers().
    """
    try:
        ticker = request.ticker.upper().strip()

        if not ticker:
            raise HTTPException(status_code=400, detail="ticker required")

        # If already tracked, just return what we have
        if ticker in tracked_stocks:
            stock_data = tracked_stocks[ticker]
            return {
                "name": ticker,
                "companyName": stock_data.get("company_name", ticker),
                "price": stock_data.get("price", 0),
                "prediction": stock_data.get("prediction", 0),
            }

        # 1) Ensure / train ML model if missing
        model_file = get_modelpath(ticker, "model")
        features_file = get_modelpath(ticker, "features")

        if not (os.path.exists(model_file) and os.path.exists(features_file)):
            # Only try if no model exists yet
            try:
                print(
                    f"[add_stock] No model found for {ticker} – "
                    "training via train_for_tickers..."
                )
                # Uses your existing helper in train_models.py
                train_for_tickers([ticker], years_back=3)
            except Exception as train_err:
                # Do not kill the request if training fails:
                # prediction will just be -1.
                print(f"[add_stock] train_for_tickers failed for {ticker}: {train_err}")

        # 2) Pull latest quote and company info from yfinance
        stock = yf.Ticker(ticker)
        info = stock.info
        symbol = info.get("symbol") if info else None

        if not info or not symbol or symbol.upper() != ticker:
            raise HTTPException(status_code=400, detail=f"{ticker} not found")

        price = get_price(stock, info)
        if not price:
            raise HTTPException(
                status_code=400,
                detail=f"{ticker} has no price data",
            )

        company = get_companyname(info) or ticker

        # 3) Ask ML model for prediction (may still be -1 if model/train failed)
        pred = get_prediction(ticker)

        tracked_stocks[ticker] = {
            "price": price,
            "prediction": pred,
            "company_name": company,
        }

        return {
            "name": ticker,
            "companyName": company,
            "price": price,
            "prediction": pred,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete('/api/stocks/{ticker}')
def remove_stock(ticker: str):
    ticker = ticker.upper()
    if ticker in tracked_stocks:
        del tracked_stocks[ticker]
        return {'message': 'stock removed'}
    else:
        raise HTTPException(status_code=404, detail='stock not found')


@app.get("/api/stocks/{ticker}/history")
def get_stock_history(
    ticker: str,
    period: str = Query(
        default="3mo",
        description="History period for yfinance (e.g. 1mo,3mo,6mo,1y,5y)"
    ),
):
    """
    Return OHLCV history for a ticker so the frontend can draw charts.
    """
    try:
        t = ticker.upper()
        stock = yf.Ticker(t)
        history = stock.history(period=period)

        if history is None or history.empty:
            raise HTTPException(status_code=400, detail="No history data for ticker")

        df = history.reset_index().rename(
            columns={
                "Date": "date",
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Volume": "volume",
            }
        )

        records = []
        for _, row in df.iterrows():
            records.append(
                {
                    "date": row["date"].strftime("%Y-%m-%d"),
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": float(row["volume"])
                    if not pd.isna(row["volume"])
                    else 0.0,
                }
            )

        return {"ticker": t, "prices": records}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@app.delete('/api/stocks')
def remove_allstocks():
    tracked_stocks.clear()
    return {'message': 'all stocks removed'}


@app.get('/api/stocks/{ticker}/risk')
def risk(
    ticker: str,
    equity: float = Query(default=100000),
    entry_price: float = Query(default=0),
    risk_per_trade: float = Query(default=0.01),
    atr_mult_sl: float = Query(default=1.5),
    atr_mult_tp: float = Query(default=3.0)
):
    try:
        ticker = ticker.upper()

        if entry_price <= 0:
            raise HTTPException(status_code=400, detail='bad entry')

        start = (date.today() - timedelta(days=365)).strftime("%Y-%m-%d")
        df = load_stocks([ticker], start).get(ticker)
        print(df)
        if df is None or df.empty:
            raise HTTPException(status_code=400, detail='no data')

        atr = df['ATR'].iloc[-1]
        if atr <= 0:
            raise HTTPException(status_code=400, detail='atr problem')

        sl = entry_price - atr_mult_sl * atr
        tp = entry_price + atr_mult_tp * atr
        if sl <= 0:
            raise HTTPException(status_code=400, detail='stop loss bad')

        risk_amt = equity * risk_per_trade
        shares = min(risk_amt / (entry_price - sl), equity / entry_price)

        return {
            'prediction': get_prediction(ticker),
            'atr': float(atr),
            'stop_loss': float(sl),
            'take_profit': float(tp),
            'recommended_shares': int(shares),
            'dollar_risk': float(risk_amt),
            'risk_per_trade': risk_per_trade
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# 🔹 NEW: admin endpoint to train models on demand
@app.post("/api/admin/train")
def admin_train_models(req: TrainRequest):
    """
    Train ML models for one or more tickers on demand.
    Frontend calls this when user clicks 'Train model' in the UI.
    """
    tickers = [t.strip().upper() for t in req.tickers if t.strip()]
    if not tickers:
        raise HTTPException(status_code=400, detail="tickers list is empty")

    try:
        train_for_tickers(tickers, years_back=3)
        return {
            "trained": tickers,
            "message": f"Trained/updated models for {', '.join(tickers)}",
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to train models: {str(e)}",
        )

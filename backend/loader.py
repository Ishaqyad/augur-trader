import yfinance as yf
import pandas as pd
from datetime import date
from indicators import compute_indicators

def load_stocks(tickers, start_date):
    end_date = date.today().strftime("%Y-%m-%d")
    stocks_data = {}
    for ticker in tickers:
        df = yf.download(ticker, start=start_date, end=end_date, interval="1d", group_by='column', auto_adjust=False)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[1] if isinstance(col, tuple) else col for col in df.columns]
        expected_cols = ['Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']
        df.columns = [col if col in expected_cols else expected_cols[i] for i, col in enumerate(df.columns)]
        df = compute_indicators(df)
        stocks_data[ticker] = df
    return stocks_data
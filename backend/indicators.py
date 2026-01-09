import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import MACD, EMAIndicator, SMAIndicator
from ta.volatility import AverageTrueRange

def compute_indicators(df):
    close = df['Close']
    df['SMA_3'] = SMAIndicator(close, window=20).sma_indicator()
    df['EMA_3'] = EMAIndicator(close, window=20).ema_indicator()
    df['RSI'] = RSIIndicator(close, window=14).rsi()
    macd = MACD(close, window_slow=19, window_fast=12, window_sign=9)
    df['MACD'] = macd.macd()
    df['MACD_signal'] = macd.macd_signal()
    atr = AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=14, fillna=True)
    df['ATR'] = atr.average_true_range()
    df['Target'] = ((close.shift(-1) / close - 1) > 0.003).astype(int)  # 0.3% threshold
    df.dropna(inplace=True)
    return df

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Basic stock info coming from /api/stocks and /api/stocks/{ticker}
 */
export interface StockData {
  name: string;
  companyName?: string;
  price: number;
  prediction: number; // 1 = UP, 0 = DOWN, -1 = no signal
}

export interface ApiError {
  error: string;
}

/**
 * Price history point for charts
 */
export interface PriceHistoryPoint {
  date: string; // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockHistoryResponse {
  ticker: string;
  prices: PriceHistoryPoint[];
}

/**
 * Risk management response from /api/stocks/{ticker}/risk
 */
export interface RiskResponse {
  prediction: number; // 1, 0, or -1
  atr: number;
  stop_loss: number;
  take_profit: number;
  recommended_shares: number;
  dollar_risk: number;
  risk_per_trade: number;
}

/**
 * Metadata about trained ML models (for Model Status UI)
 * Returned by /api/models
 */
export interface TrainedModelInfo {
  ticker: string;
  last_trained_at?: string | null;
  data_start?: string | null;
  data_end?: string | null;
}

/**
 * Client wrapper around your FastAPI backend
 */
class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = this.baseUrl + path;

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      let message = `Request failed with status ${res.status}`;
      try {
        const data = await res.json();
        if (data?.detail) message = data.detail;
        if (data?.error) message = data.error;
      } catch {
        // ignore JSON parse errors and keep default message
      }
      throw new Error(message);
    }

    if (res.status === 204) {
      // no content
      return undefined as T;
    }

    return (await res.json()) as T;
  }

  // ---------- STOCK WATCHLIST / LIVE VIEW ----------

  /**
   * GET /api/stocks
   * Returns the current tracked stocks with latest price + prediction.
   */
  async getTrackedStocks(): Promise<StockData[]> {
    return this.request<StockData[]>("/api/stocks");
  }

  /**
   * POST /api/stocks
   * Body: { ticker }
   * Adds a new stock to the tracked list and returns it.
   */
  async addStock(ticker: string): Promise<StockData> {
    return this.request<StockData>("/api/stocks", {
      method: "POST",
      body: JSON.stringify({ ticker }),
    });
  }

  /**
   * PUT /api/stocks/refresh
   * Re-fetches data for all tracked stocks.
   * Backend returns { updated, failed, message }.
   */
  async refreshStocks(): Promise<{
    updated: StockData[];
    failed: string[];
    message: string;
  }> {
    return this.request<{
      updated: StockData[];
      failed: string[];
      message: string;
    }>("/api/stocks/refresh", {
      method: "PUT",
    });
  }

  /**
   * DELETE /api/stocks/{ticker}
   * Removes one stock from the tracked list.
   */
  async removeStock(ticker: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/api/stocks/${encodeURIComponent(ticker)}`,
      {
        method: "DELETE",
      }
    );
  }

  /**
   * DELETE /api/stocks
   * Removes ALL tracked stocks.
   */
  async removeAllStocks(): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/stocks", {
      method: "DELETE",
    });
  }

  // ---------- SINGLE STOCK DATA (PORTAL / TRADEVIEW) ----------

  /**
   * GET /api/stocks/{ticker}
   * Basic quote + prediction for a single ticker.
   */
  async getStockData(ticker: string): Promise<StockData> {
    return this.request<StockData>(
      `/api/stocks/${encodeURIComponent(ticker)}`
    );
  }

  /**
   * GET /api/stocks/{ticker}/history?period=3mo
   * Price history for charts.
   * period examples: "1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max"
   */
  async getStockHistory(
    ticker: string,
    period: string
  ): Promise<StockHistoryResponse> {
    const q = new URLSearchParams({ period }).toString();
    return this.request<StockHistoryResponse>(
      `/api/stocks/${encodeURIComponent(ticker)}/history?${q}`
    );
  }

  /**
   * GET /api/stocks/{ticker}/risk
   * Risk management recommendation for a trade.
   */
  async getRiskManagement(
    ticker: string,
    equity: number,
    entryPrice: number,
    riskPerTrade: number,
    atrMultSl: number,
    atrMultTp: number
  ): Promise<RiskResponse> {
    const params = new URLSearchParams({
      equity: String(equity),
      entry_price: String(entryPrice),
      risk_per_trade: String(riskPerTrade),
      atr_mult_sl: String(atrMultSl),
      atr_mult_tp: String(atrMultTp),
    });

    return this.request<RiskResponse>(
      `/api/stocks/${encodeURIComponent(ticker)}/risk?${params.toString()}`
    );
  }

  // ---------- MODEL MANAGEMENT (for future / Model Status UI) ----------

  /**
   * GET /api/models
   * List trained models with metadata (used on Settings > Model Status).
   */
  async getModels(): Promise<TrainedModelInfo[]> {
    return this.request<TrainedModelInfo[]>("/api/models");
  }

  /**
   * POST /api/admin/train
   * Body: { tickers: string[] }
   * Trigger training for one or more tickers (optional admin feature).
   * NOTE: Backend endpoint needs to exist for this to work.
   */
  async trainModels(tickers: string[]): Promise<{
    trained: string[];
    message: string;
  }> {
    return this.request<{ trained: string[]; message: string }>(
      "/api/admin/train",
      {
        method: "POST",
        body: JSON.stringify({ tickers }),
      }
    );
  }
}

export const apiService = new ApiService();

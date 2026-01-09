import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Side = "BUY" | "SELL";

export type Position = {
  symbol: string;   // e.g., "AAPL"
  qty: number;      // shares
  avgPrice: number; // VWAP cost
  stopLoss?: number; // Stop loss price (optional)
  takeProfit?: number; // Take profit price (optional)
};

export type Order = {
  id: string;
  time: number;     // Date.now()
  symbol: string;
  qty: number;
  price: number;
  side: Side;
};

type PortfolioState = {
  equity: number;
  cash: number;
  positions: Position[];
  orders: Order[];

  reset: () => void;

  // ✅ NEW: allow UI to set the starting / fake account size
  setAccountSize: (size: number) => void;

  submitOrder: (params: {
    symbol: string;
    qty: number;
    price: number;
    side: Side;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;

  closePosition: (symbol: string) => void;
};

function recomputeEquity(cash: number, positions: Position[]) {
  const mv = positions.reduce((sum, p) => sum + p.qty * p.avgPrice, 0);
  return cash + mv;
}

export const usePortfolio = create<PortfolioState>()(
  persist(
    (set, get) => ({
      equity: 100_000,
      cash: 100_000,
      positions: [],
      orders: [],

      reset: () =>
        set(() => {
          const cash = 100_000;
          const positions: Position[] = [];
          const orders: Order[] = [];
          return {
            cash,
            positions,
            orders,
            equity: recomputeEquity(cash, positions),
          };
        }),

      // ✅ NEW: let the user choose starting fake money
      setAccountSize: (size: number) =>
        set(() => {
          const safe = size > 0 ? size : 0;
          const cash = safe;
          const positions: Position[] = [];
          const orders: Order[] = [];
          return {
            cash,
            positions,
            orders,
            equity: recomputeEquity(cash, positions),
          };
        }),

      closePosition: (symbol: string) => {
        const s = symbol.trim().toUpperCase();
        const { positions, submitOrder } = get();
        const pos = positions.find((p) => p.symbol === s);
        if (!pos || pos.qty <= 0) return; // nothing to close
        submitOrder({
          symbol: s,
          qty: pos.qty,
          price: pos.avgPrice,
          side: "SELL",
        });
      },

      submitOrder: (params) =>
        set((state) => {
          const { symbol, qty, price, side, stopLoss, takeProfit } = params;
          const s = symbol.trim().toUpperCase();
          if (!s || qty <= 0 || price <= 0) return state;

          const positions = [...state.positions];
          const idx = positions.findIndex((p) => p.symbol === s);
          const existing = idx >= 0 ? positions[idx] : undefined;

          let cash = state.cash;

          if (side === "BUY") {
            const cost = qty * price;
            if (cost > cash) return state; // insufficient cash
            cash -= cost;

            if (!existing) {
              positions.push({
                symbol: s,
                qty,
                avgPrice: price,
                stopLoss,
                takeProfit,
              });
            } else {
              const newQty = existing.qty + qty;
              const newAvg =
                (existing.avgPrice * existing.qty + price * qty) / newQty;
              positions[idx] = {
                ...existing,
                qty: newQty,
                avgPrice: newAvg,
                stopLoss: stopLoss ?? existing.stopLoss,
                takeProfit: takeProfit ?? existing.takeProfit,
              };
            }
          } else {
            // SELL
            if (!existing || existing.qty < qty) return state; // no shorting/oversell
            const proceeds = qty * price;
            cash += proceeds;

            const remaining = existing.qty - qty;
            if (remaining === 0) {
              positions.splice(idx, 1);
            } else {
              positions[idx] = { ...existing, qty: remaining };
            }
          }

          const newOrder: Order = {
            id:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : String(Date.now()),
            time: Date.now(),
            symbol: s,
            qty,
            price,
            side,
          };
          const orders = [...state.orders, newOrder];

          const equity = recomputeEquity(cash, positions);
          return { cash, positions, orders, equity };
        }),
    }),
    { name: "portfolio" }
  )
);

export type GlossaryItem = {
  term: string;
  short: string;
  detail: string;
  tags?: string[];
  usage?: string; // how a beginner might actually apply this
};


export const GLOSSARY: GlossaryItem[] = [
  {
    term: "Equity (Account Equity)",
    short: "Your total account value.",
    detail:
      "Equity is Cash + the value of all open positions. If you sold everything right now at the current prices (we're using your average price in this simulator), this is how much you'd have.",
    tags: ["account", "risk"],
  },
  {
    term: "Cash",
    short: "Uninvested buying power.",
    detail:
      "Cash is how much money you have available to buy. When you BUY shares, cash goes down. When you SELL shares, cash goes up.",
    tags: ["account", "buying power"],
  },
  {
    term: "Position",
    short: "An active holding in a stock.",
    detail:
      "If you own 10 shares of AAPL, you have an open position in AAPL. If you sell all 10 shares, that position is closed.",
    tags: ["positions", "portfolio"],
  },
  {
    term: "Average Price (Avg Cost)",
    short: "Your blended cost per share.",
    detail:
      "If you bought 5 shares at $100 and 5 shares at $120, your average price is $110. It's basically your personal 'break-even' per share.",
    tags: ["positions", "math"],
  },
  {
    term: "Unrealized P/L",
    short: "Floating profit or loss",
    detail:
      "Unrealized P/L is how much you're up or down on open positions. It moves as price moves. You don't actually lock it in until you sell.",
    tags: ["pnl", "risk"],
  },
  {
    term: "Realized P/L",
    short: "Profit/loss you've locked in",
    detail:
      "Realized P/L is the gain or loss from trades you've already closed. This is the actual money you've made or lost.",
    tags: ["pnl", "history"],
  },
  {
    term: "Order Ticket",
    short: "Form used to submit a trade.",
    detail:
      "This is where you tell the system what you want to buy or sell: symbol, quantity, and price. In live trading this is sent to your broker.",
    tags: ["order", "workflow"],
  },
  {
    term: "BUY",
    short: "Open or add to a position.",
    detail:
      "Buying increases shares you own and reduces cash. In real markets, you'd buy because you think the price will go up.",
    tags: ["order type"],
  },
  {
    term: "SELL",
    short: "Close or reduce a position.",
    detail:
      "Selling reduces the number of shares you own and increases cash. You sell either to take profit, reduce risk, or cut a loss.",
    tags: ["order type"],
  },
  {
    term: "Risk Management",
    short: "Protecting yourself from big losses.",
    detail:
      "Risk management is deciding 'how much can I lose if I'm wrong?' before you enter the trade. Beginners focus on profits first. Professionals focus on not blowing up.",
    tags: ["risk", "psychology"],
  },
  {
    term: "Position Sizing",
    short: "How big your trade is.",
    detail:
      "Position sizing answers: 'how many shares am I allowed to buy?' Good sizing is what keeps one bad trade from killing your entire account.",
    tags: ["risk", "sizing"],
  },
  {
    term: "Stop Loss",
    short: "Exit if it goes against you.",
    detail:
      "A stop loss is a plan (or sometimes an actual order) to close the trade if price drops to a certain level. It's not weakness. It's survival.",
    tags: ["risk", "discipline"],
  },
  {
    term: "Support",
    short: "Price level where buyers keep showing up.",
    detail:
      "Support is a price area that has bounced before. Traders watch it because if support breaks, price can fall harder.",
    tags: ["chart", "price action"],
  },
  {
    term: "Resistance",
    short: "Ceiling where price keeps getting rejected.",
    detail:
      "Resistance is a level price struggles to move above. If price breaks resistance with strength and volume, that can be bullish.",
    tags: ["chart", "price action"],
  },
  {
  term: "Limit Order",
  short: "You choose the price; the order fills at that price or better.",
  detail:
    "A limit BUY will only execute at your limit price or LOWER. A limit SELL will only execute at your limit price or HIGHER. If the market never trades at your price, the order can remain unfilled.",
  usage:
    "Beginners use limit orders to control slippage. For entries, place a buy limit near the price you actually want, not far above the market. For exits, a sell limit can be used to take profit at a target. Remember: protection (like stop-loss) is a different order type.",
  tags: ["order", "mechanics"],
},
{
  term: "Market Order",
  short: "Fill immediately at the current market price.",
  detail:
    "Market orders prioritize speed over price. They execute right away against available liquidity, which can result in slippage (paying more on buys, receiving less on sells).",
  usage:
    "Use sparingly—typically for quick exits or very liquid tickers. In fast markets or illiquid names, slippage can be large.",
  tags: ["order", "mechanics"],
},
  //
  // --- indicators ---
  //
{
  term: "SMA (Simple Moving Average)",
  short: "Average price over X candles.",
  detail:
    "The Simple Moving Average looks at the last N prices (like last 20 days), adds them, divides by N. Traders use it to see trend direction. If price is above the SMA, that's often considered bullish direction. Common SMAs: 20, 50, 200.",
  usage:
    "The 200 SMA is watched by swing traders and funds. If price is ABOVE the 200 SMA, they call the stock 'long-term bullish'. Dips toward the 20 or 50 SMA in an uptrend are often bought as 'pullbacks'. Beginners use moving averages like dynamic support levels.",
  tags: ["indicator", "trend"],
},

{
  term: "EMA (Exponential Moving Average)",
  short: "Faster/reactive moving average.",
  detail:
    "EMA is like SMA but gives more weight to recent candles, so it reacts quicker. Day traders like short EMAs (like 9 or 21 EMA) to see momentum changes fast.",
  usage:
    "Scalpers will sometimes say: 'Only long if price is above the 9 EMA and the 9 EMA is above the 21 EMA.' Translation: only buy when momentum is already strong. If 9 EMA crosses BELOW 21 EMA, some traders exit because momentum just flipped.",
  tags: ["indicator", "trend", "momentum"],
},

{
  term: "RSI (Relative Strength Index)",
  short: "Measures overbought/oversold.",
  detail:
    "RSI is on a 0–100 scale. High RSI (like 70+) means price ran up fast (maybe overbought). Low RSI (30 or below) means it dropped hard (maybe oversold). It's not magic — something can be 'overbought' and keep going higher.",
  usage:
    "Basic idea: some traders look to BUY when RSI is coming back UP through 30 after being oversold (bounce idea), and SELL/trim when RSI is falling DOWN from above 70 (momentum fading). You don't buy just because it's under 30 — you wait for it to curl back up.",
  tags: ["indicator", "momentum"],
},

{
  term: "MACD (Moving Average Convergence Divergence)",
  short: "Trend + momentum crossover tool.",
  detail:
    "MACD compares two EMAs and tracks how they separate and come back together. Traders watch for crossovers to guess 'is momentum flipping bullish or bearish now?' It's slower than RSI, more like 'is the bigger move turning?'",
  usage:
    "Basic read: when MACD crosses up (bullish cross) after a pullback in an overall uptrend, some traders take that as 'momentum is coming back, buyers are stepping in again'. It's rarely used alone — more as confirmation.",
  tags: ["indicator", "trend", "momentum"],
},

  {
    term: "Volume",
    short: "How many shares traded.",
    detail:
      "Volume tells you how much interest there is. A breakout above resistance with low volume is weak. A breakout with huge volume means real buyers showed up.",
    tags: ["market strength", "confirmations"],
  },
{
  term: "VWAP (Volume Weighted Average Price)",
  short: "Average price weighted by volume today.",
  detail:
    "Day traders watch VWAP to see the 'fair' price institutions paid throughout the session. Price above VWAP = strong buyers. Price below VWAP = sellers in control.",
  usage:
    "Basic intraday rule: If price is above VWAP and keeps bouncing off VWAP and going higher, bulls are in control. If price can't get back above VWAP, it's usually weak and traders avoid long entries. A super basic long scalp idea is: buy near VWAP in an uptrend, sell on pushes away from VWAP.",
  tags: ["intraday", "indicator"],
},

  {
    term: "Breakout",
    short: "Price pushes through resistance.",
    detail:
      "When price finally gets above a level it couldn't beat before — traders sometimes jump in because it means buyers took control. Fake breakouts are also a thing.",
    tags: ["price action", "entries"],
  },
  {
    term: "Pullback",
    short: "Temporary move against the trend.",
    detail:
      "Example: Stock is trending up, then dips a little, then continues up. Some traders prefer buying the pullback instead of chasing at the highs.",
    tags: ["price action", "entries"],
  },
  {
    term: "Chop",
    short: "No clear direction. Messy.",
    detail:
      "Chop is when price is just bouncing up/down in a tight range with no steady trend. This is where beginners overtrade and get frustrated.",
    tags: ["psychology", "market condition"],
  },
  {
    term: "FOMO",
    short: "Fear of Missing Out.",
    detail:
      "That rush feeling like 'I’m gonna miss the move' so you jump in late with no plan. FOMO is one of the most expensive emotions in trading.",
    tags: ["psychology"],
  },
];

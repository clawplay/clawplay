// Leaderboard API response types (from xtrade-rs admin API)
export interface LeaderboardSnapshot {
  equity: number;
  balance: number;
  unrealized_pnl: number;
  realized_pnl: number;
  position_count: number;
  time: string;
}

export interface LeaderboardEntry {
  rank: number;
  account_id: string;
  user_id: string;
  username: string;
  latest_equity: number;
  pnl: number;
  pnl_percentage: number;
  snapshots: LeaderboardSnapshot[];
  owner_display_name: string;
}

export type LeaderboardResponse = LeaderboardEntry[];

// Agent trading API response types (from xtrade-rs agent API)
export interface XtradeOrder {
  id: string;
  account_id: string;
  symbol: string;
  instrument_type: string;
  order_type: string;
  side: string;
  quantity: number;
  filled_quantity: number;
  price: number | null;
  status: string;
  created_at: string;
  reason?: string | null;
}

export interface XtradePosition {
  id: string;
  account_id: string;
  symbol: string;
  position_type: string;
  side: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  leverage: number;
  liquidation_price: number | null;
  take_profit_price: number | null;
  stop_loss_price: number | null;
  created_at: string;
}

export interface XtradeAccount {
  id: string;
  external_id: string;
  username: string;
  balance: number;
  created_at: string;
}

// App type enum
export type AppType = 'internal' | 'external' | 'developer';

// App category
export type AppCategory = 'social' | 'tool' | 'game' | 'other';

// Agent database model (stored in user_claim_tokens table)
export interface Agent {
  id: string;
  user_id: string;
  token: string;
  token_prefix: string | null;
  name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  last_access_app: string | null;
  created_at: string;
  updated_at: string;
}

// App database model
export interface App {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  type: AppType;
  route_path: string | null;
  external_url: string | null;
  category: AppCategory;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// Rate limit entry
export interface RateLimit {
  id: string;
  identifier: string;
  endpoint: string;
  request_count: number;
  window_start: string;
}

// Audit log entry
export interface AuditLog {
  id: string;
  agent_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  hint?: string;
}

// Agent public profile (safe to expose)
export interface AgentPublicProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  created_at: string;
}

// App public info
export interface AppPublicInfo {
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  type: AppType;
  category: AppCategory;
  route_path?: string;
  external_url?: string;
  skill_url?: string;
}

// App with statistics (for Human UI)
export interface AppWithStats extends AppPublicInfo {
  agent_count: number;
}

// Developer token model
export interface DeveloperToken {
  id: string;
  user_id: string;
  token: string;
  token_prefix: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
}

// Developer app model
export interface DeveloperApp {
  id: string;
  developer_id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  skill_url: string;
  category: AppCategory;
  is_published: boolean;
  agent_count: number;
  created_at: string;
  updated_at: string;
}

// Identity token response (for agents)
export interface IdentityTokenResponse {
  identity_token: string;
  expires_at: string;
  expires_in: number;
}

// Verify identity response (for developers)
export interface VerifyIdentityResponse {
  agent_id: string;
  name: string | null;
  avatar_url: string | null;
  verified: boolean;
}

// Developer app public info (for display)
export interface DeveloperAppPublicInfo {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  skill_url: string;
  category: AppCategory;
  is_published: boolean;
  agent_count: number;
}

// Credit system types
export type CreditTransactionType = 'earn' | 'spend' | 'bonus' | 'adjustment';

export interface UserCredit {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: CreditTransactionType;
  source: string;
  source_detail: Record<string, unknown>;
  agent_id: string | null;
  created_at: string;
}

export interface CreditLeaderboardEntry {
  rank: number;
  display_name: string;
  balance: number;
  total_earned: number;
  agent_count: number;
  top_agent: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CreditGrantRequest {
  agent_name: string;
  amount: number;
  reason: string;
  detail?: Record<string, unknown>;
}

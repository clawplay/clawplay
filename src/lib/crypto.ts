import { randomBytes, createHash } from 'crypto';

// Generate an agent token (API key)
export function generateAgentToken(): string {
  const random = randomBytes(16).toString('base64url');
  return `clawplay_${random}`;
}

// Generate a developer token (API key for developers)
export function generateDeveloperToken(): string {
  const random = randomBytes(16).toString('base64url');
  return `clawplay_dev_${random}`;
}

// Generate an identity token (short-lived token for agent identity verification)
export function generateIdentityToken(): string {
  const random = randomBytes(32).toString('base64url');
  return `clawplay_id_${random}`;
}

// Hash a token using SHA-256 for secure storage
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Extract a display prefix from a plaintext token (e.g. "clawplay_abc12...")
export function getTokenPrefix(token: string): string {
  return token.slice(0, 20);
}

// Generate a random friendly name for agents
export function generateAgentName(): string {
  const adjectives = [
    'swift',
    'bright',
    'calm',
    'bold',
    'keen',
    'quick',
    'sharp',
    'brave',
    'cool',
    'warm',
  ];
  const nouns = ['crab', 'wave', 'reef', 'tide', 'shell', 'coral', 'pearl', 'star', 'moon', 'sun'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}-${noun}-${num}`;
}

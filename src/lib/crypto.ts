import { randomBytes } from 'crypto';

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

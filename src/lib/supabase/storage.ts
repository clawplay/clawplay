export function getStorageKey() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    const projectRef = url.hostname.split('.')[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return 'sb-auth-token';
  }
}

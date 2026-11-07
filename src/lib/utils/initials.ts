/** "Ana María Gómez" → "AG"; "ana" → "A"; empty → "?". Used by the avatar fallback. */
export function getInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0];
  const last = words.length > 1 ? words.at(-1)?.[0] : undefined;
  return `${first ?? ''}${last ?? ''}`.toUpperCase() || '?';
}

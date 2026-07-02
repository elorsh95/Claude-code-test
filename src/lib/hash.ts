/**
 * גיבוב SHA-256 והחזרת מחרוזת hex.
 * משמש להשוואת מייל/טלפון של הזמנה מבלי לשמור את הערך המקורי.
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

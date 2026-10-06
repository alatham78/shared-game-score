const encoder = new TextEncoder();
const HOUSEHOLD = {
  userId: 'household',
  userDetails: 'Household',
  identityProvider: 'pin',
};

function bytes(value) {
  return encoder.encode(value);
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    bytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, bytes(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  const left = bytes(a);
  const right = bytes(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export async function sessionToken(pin) {
  return hmacHex(pin, 'scorecast-session');
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export function cookieHeader(request, value, maxAgeSeconds) {
  const url = new URL(request.url);
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `scorecast=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export async function principalFromRequest(request, pin) {
  if (!pin) return null;
  const expected = await sessionToken(pin);
  const cookie = readCookie(request, 'scorecast');
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const token = cookie || bearer;
  if (!token) return null;
  if (!timingSafeEqual(token, expected)) return null;
  return HOUSEHOLD;
}

export async function pinMatches(provided, pin) {
  if (!pin || provided == null) return false;
  return timingSafeEqual(String(provided), String(pin));
}

export { HOUSEHOLD };

import test from 'node:test';
import assert from 'node:assert/strict';
import { pinMatches, principalFromRequest, sessionToken } from '../src/auth.js';

test('pinMatches accepts the configured PIN and rejects others', async () => {
  assert.equal(await pinMatches('7391', '7391'), true);
  assert.equal(await pinMatches('0000', '7391'), false);
  assert.equal(await pinMatches(null, '7391'), false);
  assert.equal(await pinMatches('7391', ''), false);
});

test('principalFromRequest accepts cookie or bearer token', async () => {
  const pin = '7391';
  const token = await sessionToken(pin);

  const viaCookie = await principalFromRequest(
    new Request('http://local/api/me', { headers: { cookie: `scorecast=${token}` } }),
    pin
  );
  assert.equal(viaCookie.userId, 'household');

  const viaBearer = await principalFromRequest(
    new Request('http://local/api/me', { headers: { authorization: `Bearer ${token}` } }),
    pin
  );
  assert.equal(viaBearer.userId, 'household');

  const missing = await principalFromRequest(new Request('http://local/api/me'), pin);
  assert.equal(missing, null);

  const wrong = await principalFromRequest(
    new Request('http://local/api/me', { headers: { authorization: 'Bearer deadbeef' } }),
    pin
  );
  assert.equal(wrong, null);
});

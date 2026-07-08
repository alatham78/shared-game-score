'use strict';

/**
 * Static Web Apps injects the authenticated user as a base64-encoded JSON
 * blob in the x-ms-client-principal header on every request that reaches
 * the linked Functions API. Routes are locked to authenticated users in
 * staticwebapp.config.json, so a missing/invalid header means the request
 * did not come through SWA and is rejected.
 */
function parsePrincipal(headerValue) {
  if (!headerValue) return null;
  try {
    const decoded = Buffer.from(headerValue, 'base64').toString('utf8');
    const principal = JSON.parse(decoded);
    if (!principal || !principal.userId) return null;
    return {
      userId: principal.userId,
      userDetails: principal.userDetails || '',
      identityProvider: principal.identityProvider || '',
      userRoles: principal.userRoles || [],
    };
  } catch {
    return null;
  }
}

module.exports = { parsePrincipal };

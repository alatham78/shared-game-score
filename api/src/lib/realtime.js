'use strict';

/**
 * Real-time fan-out to display devices via Azure Web PubSub (free tier).
 *
 * Every browser session for a given account joins the group `user-<hash>`;
 * when a round is submitted we broadcast the updated game to that group so
 * TVs/iPads refresh instantly. When WEBPUBSUB_CONNECTION_STRING is not
 * configured (e.g. local dev) everything degrades gracefully: /api/negotiate
 * returns no URL and clients fall back to polling.
 */

const crypto = require('node:crypto');

const HUB = 'scoreboard';

let serviceClient = null;

function getServiceClient() {
  const connectionString = process.env.WEBPUBSUB_CONNECTION_STRING;
  if (!connectionString) return null;
  if (!serviceClient) {
    const { WebPubSubServiceClient } = require('@azure/web-pubsub');
    serviceClient = new WebPubSubServiceClient(connectionString, HUB);
  }
  return serviceClient;
}

/** Group names must be Web PubSub-safe; principal userIds may not be. */
function groupForUser(userId) {
  return `user-${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 32)}`;
}

/** Client access URL that auto-joins the caller's group, or null when unconfigured. */
async function negotiate(userId) {
  const client = getServiceClient();
  if (!client) return null;
  const token = await client.getClientAccessToken({
    userId: groupForUser(userId),
    groups: [groupForUser(userId)],
    expirationTimeInMinutes: 60 * 8,
  });
  return token.url;
}

/** Fire-and-forget broadcast of an updated game to all of the user's devices. */
async function broadcastGameUpdate(userId, game) {
  const client = getServiceClient();
  if (!client) return;
  try {
    await client.group(groupForUser(userId)).sendToAll({ type: 'game-updated', game });
  } catch (err) {
    // Real-time is best-effort; displays also poll as a fallback.
    console.error('web pubsub broadcast failed:', err.message);
  }
}

module.exports = { negotiate, broadcastGameUpdate, groupForUser };

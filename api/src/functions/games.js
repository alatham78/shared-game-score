'use strict';

const { app } = require('@azure/functions');
const controllers = require('../lib/controllers');
const { parsePrincipal } = require('../lib/auth');

/**
 * Azure Functions v4 entry points. Each route adapts the Functions
 * request into the transport-agnostic controller context.
 */

function handle(controller) {
  return async (request, context) => {
    const principal = parsePrincipal(request.headers.get('x-ms-client-principal'));
    if (!principal) {
      return { status: 401, jsonBody: { error: 'Not authenticated' } };
    }

    let body = null;
    if (request.method === 'POST' || request.method === 'PATCH') {
      try {
        body = await request.json();
      } catch {
        body = null;
      }
    }

    try {
      return await controller({ principal, params: request.params, body });
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: 'Internal server error' } };
    }
  };
}

app.http('listGames', {
  methods: ['GET'],
  route: 'games',
  authLevel: 'anonymous',
  handler: handle(controllers.listGames),
});

app.http('createGame', {
  methods: ['POST'],
  route: 'games',
  authLevel: 'anonymous',
  handler: handle(controllers.createGame),
});

app.http('getActiveGame', {
  methods: ['GET'],
  route: 'games/active',
  authLevel: 'anonymous',
  handler: handle(controllers.getActiveGame),
});

app.http('getGame', {
  methods: ['GET'],
  route: 'games/{id}',
  authLevel: 'anonymous',
  handler: handle(controllers.getGame),
});

app.http('updateGame', {
  methods: ['PATCH'],
  route: 'games/{id}',
  authLevel: 'anonymous',
  handler: handle(controllers.updateGame),
});

app.http('submitRound', {
  methods: ['POST'],
  route: 'games/{id}/rounds',
  authLevel: 'anonymous',
  handler: handle(controllers.submitRound),
});

app.http('undoLastRound', {
  methods: ['DELETE'],
  route: 'games/{id}/rounds/last',
  authLevel: 'anonymous',
  handler: handle(controllers.undoLastRound),
});

app.http('negotiate', {
  methods: ['GET'],
  route: 'negotiate',
  authLevel: 'anonymous',
  handler: handle(controllers.negotiateRealtime),
});

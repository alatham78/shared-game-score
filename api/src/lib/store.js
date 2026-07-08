'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Data layer with two interchangeable backends:
 *  - Cosmos DB (serverless) when COSMOS_CONNECTION_STRING is configured —
 *    this is what production uses.
 *  - A JSON file under .data/ for local development and tests, so the app
 *    runs end-to-end with zero cloud dependencies.
 *
 * Both expose: listGames(userId), getGame(userId, id),
 * getActiveGame(userId), createGame(game), updateGame(game).
 */

class CosmosStore {
  constructor(connectionString) {
    const { CosmosClient } = require('@azure/cosmos');
    this.client = new CosmosClient(connectionString);
    this.ready = null;
  }

  async container() {
    if (!this.ready) {
      this.ready = (async () => {
        const { database } = await this.client.databases.createIfNotExists({ id: 'scoreboard' });
        const { container } = await database.containers.createIfNotExists({
          id: 'games',
          partitionKey: { paths: ['/userId'] },
        });
        return container;
      })();
    }
    return this.ready;
  }

  async listGames(userId) {
    const container = await this.container();
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();
    return resources;
  }

  async getGame(userId, id) {
    const container = await this.container();
    try {
      const { resource } = await container.item(id, userId).read();
      return resource || null;
    } catch (err) {
      if (err.code === 404) return null;
      throw err;
    }
  }

  async getActiveGame(userId) {
    const container = await this.container();
    const { resources } = await container.items
      .query({
        query:
          "SELECT * FROM c WHERE c.userId = @userId AND c.status = 'active' ORDER BY c.updatedAt DESC OFFSET 0 LIMIT 1",
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();
    return resources[0] || null;
  }

  async createGame(game) {
    const container = await this.container();
    const { resource } = await container.items.create(game);
    return resource;
  }

  async updateGame(game) {
    const container = await this.container();
    const { resource } = await container.item(game.id, game.userId).replace(game);
    return resource;
  }
}

class FileStore {
  constructor(dataDir) {
    this.file = path.join(dataDir, 'games.json');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  read() {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      return [];
    }
  }

  write(games) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(games, null, 2));
  }

  async listGames(userId) {
    return this.read()
      .filter((g) => g.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getGame(userId, id) {
    return this.read().find((g) => g.userId === userId && g.id === id) || null;
  }

  async getActiveGame(userId) {
    const games = await this.listGames(userId);
    return games.find((g) => g.status === 'active') || null;
  }

  async createGame(game) {
    const games = this.read();
    games.push(game);
    this.write(games);
    return game;
  }

  async updateGame(game) {
    const games = this.read();
    const index = games.findIndex((g) => g.id === game.id && g.userId === game.userId);
    if (index === -1) throw new Error(`game ${game.id} not found`);
    games[index] = game;
    this.write(games);
    return game;
  }
}

let storeInstance = null;

function getStore() {
  if (!storeInstance) {
    const connectionString = process.env.COSMOS_CONNECTION_STRING;
    storeInstance = connectionString
      ? new CosmosStore(connectionString)
      : new FileStore(process.env.DATA_DIR || path.join(process.cwd(), '.data'));
  }
  return storeInstance;
}

function resetStore() {
  storeInstance = null;
}

function newId() {
  return crypto.randomUUID();
}

module.exports = { getStore, resetStore, newId };

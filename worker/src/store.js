export function newId() {
  return crypto.randomUUID();
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    data TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_games_user_updated ON games(user_id, updated_at DESC)`,
];

function parseRow(row) {
  if (!row) return null;
  return JSON.parse(row.data);
}

export class D1Store {
  constructor(db) {
    this.db = db;
    this.ready = null;
  }

  async ensure() {
    if (!this.ready) {
      this.ready = this.applySchema().catch((err) => {
        this.ready = null;
        throw err;
      });
    }
    await this.ready;
  }

  async applySchema() {
    for (const sql of SCHEMA_STATEMENTS) {
      await this.db.prepare(sql).run();
    }
  }

  async listGames(userId) {
    await this.ensure();
    const { results } = await this.db
      .prepare('SELECT data FROM games WHERE user_id = ? ORDER BY updated_at DESC')
      .bind(userId)
      .all();
    return (results || []).map(parseRow);
  }

  async getGame(userId, id) {
    await this.ensure();
    const row = await this.db
      .prepare('SELECT data FROM games WHERE id = ? AND user_id = ?')
      .bind(id, userId)
      .first();
    return parseRow(row);
  }

  async getActiveGame(userId) {
    await this.ensure();
    const active = await this.db
      .prepare(
        "SELECT data FROM games WHERE user_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1"
      )
      .bind(userId)
      .first();
    if (active) return parseRow(active);
    const latest = await this.db
      .prepare('SELECT data FROM games WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1')
      .bind(userId)
      .first();
    return parseRow(latest);
  }

  async createGame(game) {
    await this.ensure();
    await this.db
      .prepare('INSERT INTO games (id, user_id, status, updated_at, data) VALUES (?, ?, ?, ?, ?)')
      .bind(game.id, game.userId, game.status, game.updatedAt, JSON.stringify(game))
      .run();
    return game;
  }

  async updateGame(game) {
    await this.ensure();
    const result = await this.db
      .prepare(
        'UPDATE games SET status = ?, updated_at = ?, data = ? WHERE id = ? AND user_id = ?'
      )
      .bind(game.status, game.updatedAt, JSON.stringify(game), game.id, game.userId)
      .run();
    if (!result.meta?.changes) throw new Error(`game ${game.id} not found`);
    return game;
  }
}

/** In-memory backend for unit tests. */
export class MemoryStore {
  constructor() {
    this.games = [];
  }

  async listGames(userId) {
    return this.games
      .filter((g) => g.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((g) => structuredClone(g));
  }

  async getGame(userId, id) {
    const game = this.games.find((g) => g.userId === userId && g.id === id);
    return game ? structuredClone(game) : null;
  }

  async getActiveGame(userId) {
    const games = await this.listGames(userId);
    return games.find((g) => g.status === 'active') || games[0] || null;
  }

  async createGame(game) {
    this.games.push(structuredClone(game));
    return structuredClone(game);
  }

  async updateGame(game) {
    const index = this.games.findIndex((g) => g.id === game.id && g.userId === game.userId);
    if (index === -1) throw new Error(`game ${game.id} not found`);
    this.games[index] = structuredClone(game);
    return structuredClone(game);
  }
}

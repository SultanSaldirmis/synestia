import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('synestia.db');
    await initDb(_db);
  }
  return _db;
}

async function initDb(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS moments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      uid         TEXT NOT NULL,
      photoUri    TEXT,
      latitude    REAL,
      longitude   REAL,
      firestoreId TEXT,
      createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cached_posts (
      id          TEXT PRIMARY KEY,
      uid         TEXT NOT NULL,
      title       TEXT,
      excerpt     TEXT,
      category    TEXT,
      createdAt   TEXT
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export type MomentRow = {
  id?: number;
  uid: string;
  photoUri?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  firestoreId?: string | null;
  createdAt?: string;
};

// ---------- MOMENTS ----------

export async function insertMoment(row: MomentRow): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO moments (uid, photoUri, latitude, longitude, firestoreId)
     VALUES (?, ?, ?, ?, ?)`,
    [row.uid, row.photoUri ?? null, row.latitude ?? null, row.longitude ?? null, row.firestoreId ?? null],
  );
  return result.lastInsertRowId;
}

export async function getMomentsByUid(uid: string): Promise<MomentRow[]> {
  const db = await getDb();
  return db.getAllAsync<MomentRow>(
    `SELECT * FROM moments WHERE uid = ? ORDER BY createdAt DESC`,
    [uid],
  );
}

export async function updateMomentPhoto(id: number, photoUri: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE moments SET photoUri = ? WHERE id = ?`, [photoUri, id]);
}

export async function updateMomentLocation(id: number, lat: number, lng: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE moments SET latitude = ?, longitude = ? WHERE id = ?`, [lat, lng, id]);
}

export async function deleteMoment(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM moments WHERE id = ?`, [id]);
}

// ---------- CACHED POSTS ----------

export type CachedPost = {
  id: string;
  uid: string;
  title?: string | null;
  excerpt?: string | null;
  category?: string | null;
  createdAt?: string | null;
};

export async function upsertCachedPost(post: CachedPost): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO cached_posts (id, uid, title, excerpt, category, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [post.id, post.uid, post.title ?? null, post.excerpt ?? null, post.category ?? null, post.createdAt ?? null],
  );
}

export async function getCachedPostsByUid(uid: string): Promise<CachedPost[]> {
  const db = await getDb();
  return db.getAllAsync<CachedPost>(`SELECT * FROM cached_posts WHERE uid = ?`, [uid]);
}

export async function deleteCachedPost(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM cached_posts WHERE id = ?`, [id]);
}

// ---------- USER SETTINGS ----------

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`,
    [key, value],
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM user_settings WHERE key = ?`, [key]);
  return row?.value ?? null;
}

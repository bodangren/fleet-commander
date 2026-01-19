import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

let db: Database.Database | null = null

export function initDatabase() {
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  const dbPath = join(userDataPath, 'conductor.db')
  db = new Database(dbPath)

  // Create a test table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Log initialization
  const stmt = db.prepare('INSERT INTO system_log (event) VALUES (?)')
  stmt.run('Database initialized')

  return db
}

export function getDatabase() {
  if (!db) {
    return initDatabase()
  }
  return db
}

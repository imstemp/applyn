import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

let db: Database.Database | null = null;

export function initializeDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'database.db');
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables if they don't exist
  createTables(db);
  
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

function createTables(database: Database.Database) {
  // Profile table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Profile (
      id TEXT PRIMARY KEY,
      workHistory TEXT NOT NULL,
      skills TEXT NOT NULL,
      education TEXT NOT NULL,
      personalInfo TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Resume table
  database.exec(`
    CREATE TABLE IF NOT EXISTS Resume (
      id TEXT PRIMARY KEY,
      profileId TEXT NOT NULL,
      jobType TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 0,
      isTrueResume INTEGER NOT NULL DEFAULT 0,
      jobDescription TEXT,
      companyName TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (profileId) REFERENCES Profile(id) ON DELETE CASCADE
    )
  `);

  // CoverLetter table
  database.exec(`
    CREATE TABLE IF NOT EXISTS CoverLetter (
      id TEXT PRIMARY KEY,
      resumeId TEXT NOT NULL,
      jobTitle TEXT NOT NULL,
      companyName TEXT NOT NULL,
      jobDescription TEXT,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (resumeId) REFERENCES Resume(id) ON DELETE CASCADE
    )
  `);

  // InterviewPrep table
  database.exec(`
    CREATE TABLE IF NOT EXISTS InterviewPrep (
      id TEXT PRIMARY KEY,
      resumeId TEXT NOT NULL UNIQUE,
      notes TEXT NOT NULL,
      questions TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (resumeId) REFERENCES Resume(id) ON DELETE CASCADE
    )
  `);

  // SkillsHighlight table
  database.exec(`
    CREATE TABLE IF NOT EXISTS SkillsHighlight (
      id TEXT PRIMARY KEY,
      resumeId TEXT NOT NULL,
      jobDescription TEXT NOT NULL,
      matchedSkills TEXT NOT NULL,
      suggestions TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (resumeId) REFERENCES Resume(id) ON DELETE CASCADE
    )
  `);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}




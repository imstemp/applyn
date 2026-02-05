import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';

export function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function parseJson<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function stringifyJson(data: any): string {
  return JSON.stringify(data);
}

// Profile helpers
export function getProfile(db: Database.Database) {
  const stmt = db.prepare('SELECT * FROM Profile LIMIT 1');
  const row = stmt.get() as any;
  if (!row) return null;
  
  return {
    id: row.id,
    workHistory: parseJson(row.workHistory),
    skills: parseJson(row.skills),
    education: parseJson(row.education),
    personalInfo: parseJson(row.personalInfo),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export function saveProfile(db: Database.Database, data: any) {
  const existing = getProfile(db);
  
  if (existing) {
    const stmt = db.prepare(`
      UPDATE Profile 
      SET workHistory = ?, skills = ?, education = ?, personalInfo = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);
    stmt.run(
      stringifyJson(data.workHistory),
      stringifyJson(data.skills),
      stringifyJson(data.education),
      stringifyJson(data.personalInfo),
      existing.id
    );
    return getProfile(db);
  } else {
    const id = generateId();
    const stmt = db.prepare(`
      INSERT INTO Profile (id, workHistory, skills, education, personalInfo)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      stringifyJson(data.workHistory),
      stringifyJson(data.skills),
      stringifyJson(data.education),
      stringifyJson(data.personalInfo)
    );
    return getProfile(db);
  }
}

// Resume helpers
export function getResumes(db: Database.Database) {
  const stmt = db.prepare('SELECT * FROM Resume ORDER BY createdAt DESC');
  const rows = stmt.all() as any[];
  
  return rows.map(row => ({
    id: row.id,
    profileId: row.profileId,
    jobType: row.jobType,
    title: row.title,
    content: parseJson(row.content),
    isActive: Boolean(row.isActive),
    isTrueResume: Boolean(row.isTrueResume),
    jobDescription: row.jobDescription,
    companyName: row.companyName,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

export function getResumeById(db: Database.Database, id: string) {
  const stmt = db.prepare('SELECT * FROM Resume WHERE id = ?');
  const row = stmt.get(id) as any;
  if (!row) return null;
  
  return {
    id: row.id,
    profileId: row.profileId,
    jobType: row.jobType,
    title: row.title,
    content: parseJson(row.content),
    isActive: Boolean(row.isActive),
    isTrueResume: Boolean(row.isTrueResume),
    jobDescription: row.jobDescription,
    companyName: row.companyName,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export function createResume(db: Database.Database, data: any) {
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO Resume (id, profileId, jobType, title, content, isActive, isTrueResume, jobDescription, companyName)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    data.profileId,
    data.jobType,
    data.title,
    stringifyJson(data.content),
    data.isActive ? 1 : 0,
    data.isTrueResume ? 1 : 0,
    data.jobDescription || null,
    data.companyName || null
  );
  return getResumeById(db, id);
}

export function updateResume(db: Database.Database, id: string, data: any) {
  const stmt = db.prepare(`
    UPDATE Resume 
    SET jobType = ?, title = ?, content = ?, updatedAt = datetime('now')
    WHERE id = ?
  `);
  stmt.run(
    data.jobType,
    data.title,
    stringifyJson(data.content),
    id
  );
  return getResumeById(db, id);
}

export function deleteResume(db: Database.Database, id: string) {
  const stmt = db.prepare('DELETE FROM Resume WHERE id = ?');
  stmt.run(id);
}

export function setActiveResume(db: Database.Database, id: string) {
  // Deactivate all resumes
  db.prepare('UPDATE Resume SET isActive = 0').run();
  // Activate the selected one
  db.prepare('UPDATE Resume SET isActive = 1 WHERE id = ?').run(id);
  return getResumeById(db, id);
}

// Cover Letter helpers
export function getCoverLetters(db: Database.Database, resumeId: string) {
  const stmt = db.prepare('SELECT * FROM CoverLetter WHERE resumeId = ? ORDER BY createdAt DESC');
  const rows = stmt.all(resumeId) as any[];
  
  return rows.map(row => ({
    id: row.id,
    resumeId: row.resumeId,
    jobTitle: row.jobTitle,
    companyName: row.companyName,
    jobDescription: row.jobDescription,
    content: row.content,
    createdAt: new Date(row.createdAt),
  }));
}

export function createCoverLetter(db: Database.Database, data: any) {
  const id = generateId();
  const stmt = db.prepare(`
    INSERT INTO CoverLetter (id, resumeId, jobTitle, companyName, jobDescription, content)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    data.resumeId,
    data.jobTitle,
    data.companyName,
    data.jobDescription || null,
    data.content
  );
  
  const row = db.prepare('SELECT * FROM CoverLetter WHERE id = ?').get(id) as any;
  return {
    id: row.id,
    resumeId: row.resumeId,
    jobTitle: row.jobTitle,
    companyName: row.companyName,
    jobDescription: row.jobDescription,
    content: row.content,
    createdAt: new Date(row.createdAt),
  };
}

// Interview Prep helpers
export function getInterviewPrep(db: Database.Database, resumeId: string) {
  const stmt = db.prepare('SELECT * FROM InterviewPrep WHERE resumeId = ?');
  const row = stmt.get(resumeId) as any;
  if (!row) return null;
  
  return {
    id: row.id,
    resumeId: row.resumeId,
    notes: parseJson(row.notes),
    questions: parseJson(row.questions),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export function createOrUpdateInterviewPrep(db: Database.Database, resumeId: string, data: any) {
  const existing = getInterviewPrep(db, resumeId);
  
  if (existing) {
    const stmt = db.prepare(`
      UPDATE InterviewPrep 
      SET notes = ?, questions = ?, updatedAt = datetime('now')
      WHERE resumeId = ?
    `);
    stmt.run(
      stringifyJson(data.notes),
      stringifyJson(data.questions),
      resumeId
    );
    return getInterviewPrep(db, resumeId);
  } else {
    const id = generateId();
    const stmt = db.prepare(`
      INSERT INTO InterviewPrep (id, resumeId, notes, questions)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(
      id,
      resumeId,
      stringifyJson(data.notes),
      stringifyJson(data.questions)
    );
    return getInterviewPrep(db, resumeId);
  }
}

// Skills Highlight helpers
export function getSkillsHighlight(db: Database.Database, resumeId: string, jobDescription: string) {
  const stmt = db.prepare('SELECT * FROM SkillsHighlight WHERE resumeId = ? AND jobDescription = ?');
  const row = stmt.get(resumeId, jobDescription) as any;
  if (!row) return null;
  
  return {
    id: row.id,
    resumeId: row.resumeId,
    jobDescription: row.jobDescription,
    matchedSkills: parseJson(row.matchedSkills),
    suggestions: parseJson(row.suggestions),
    createdAt: new Date(row.createdAt),
  };
}

export function createOrUpdateSkillsHighlight(db: Database.Database, data: any) {
  const existing = getSkillsHighlight(db, data.resumeId, data.jobDescription);
  
  if (existing) {
    const stmt = db.prepare(`
      UPDATE SkillsHighlight 
      SET matchedSkills = ?, suggestions = ?
      WHERE id = ?
    `);
    stmt.run(
      stringifyJson(data.matchedSkills),
      stringifyJson(data.suggestions),
      existing.id
    );
    return getSkillsHighlight(db, data.resumeId, data.jobDescription);
  } else {
    const id = generateId();
    const stmt = db.prepare(`
      INSERT INTO SkillsHighlight (id, resumeId, jobDescription, matchedSkills, suggestions)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.resumeId,
      data.jobDescription,
      stringifyJson(data.matchedSkills),
      stringifyJson(data.suggestions)
    );
    return getSkillsHighlight(db, data.resumeId, data.jobDescription);
  }
}




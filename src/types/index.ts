export interface Resume {
  id: string;
  profileId: string;
  jobType: string;
  title?: string | null;
  content: any;
  isActive: boolean;
  isTrueResume: boolean;
  jobDescription?: string | null;
  companyName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  workHistory: any;
  skills: any; // JSON array (SQLite stores as JSON, not String[])
  education: any;
  personalInfo: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CoverLetter {
  id: string;
  resumeId: string;
  jobTitle: string;
  companyName: string;
  jobDescription?: string | null;
  content: string;
  createdAt: Date;
}

export interface InterviewPrep {
  id: string;
  resumeId: string;
  notes: any;
  questions: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillsHighlight {
  id: string;
  resumeId: string;
  jobDescription: string;
  matchedSkills: any;
  suggestions: any;
  createdAt: Date;
}


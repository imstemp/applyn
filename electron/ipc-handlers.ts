import { ipcMain, dialog, BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import { getAnthropicKey } from './config';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import * as path from 'path';
import * as fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { generateResumeContent } from './resume-generator';
import {
  getProfile,
  saveProfile,
  getResumes,
  getResumeById,
  createResume,
  updateResume,
  deleteResume,
  setActiveResume,
  getCoverLetters,
  createCoverLetter,
  getInterviewPrep,
  createOrUpdateInterviewPrep,
  getSkillsHighlight,
  createOrUpdateSkillsHighlight,
  generateId,
  parseJson,
  stringifyJson,
} from './db-helpers';
import { initializeDatabase } from './db';

let db: Database.Database | null = null;
let mainWindow: BrowserWindow | null = null;

export function setDatabase(database: Database.Database) {
  db = database;
}

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

function getDatabase(): Database.Database {
  if (!db) {
    // Lazy initialization - only initialize when first needed
    console.log('Initializing database on first use...');
    db = initializeDatabase();
  }
  return db;
}

const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';

function parseJsonFromClaude(text: string): any {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return JSON.parse(codeBlock ? codeBlock[1].trim() : trimmed);
}

async function callClaude(options: {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    throw new Error('Claude API key not set. Please configure it in settings.');
  }
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: options.maxTokens ?? 4096,
    system: options.system,
    messages: options.messages,
  });
  const block = response.content?.[0];
  if (!block || block.type !== 'text') {
    throw new Error('No text in Claude response');
  }
  return block.text;
}

// Profile handlers
ipcMain.handle('profile:get', async () => {
  try {
    const profile = getProfile(getDatabase());
    return { success: true, data: profile };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return { success: false, error: 'Failed to fetch profile' };
  }
});

ipcMain.handle('profile:update', async (_event, data: any) => {
  try {
    const profile = saveProfile(getDatabase(), data);
    return { success: true, data: profile };
  } catch (error) {
    console.error('Error saving profile:', error);
    return { success: false, error: 'Failed to save profile' };
  }
});

// Resume handlers
ipcMain.handle('resume:list', async () => {
  try {
    const resumes = getResumes(getDatabase());
    return { success: true, data: resumes };
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return { success: false, error: 'Failed to fetch resumes' };
  }
});

ipcMain.handle('resume:get', async (_event, id: string) => {
  try {
    const resume = getResumeById(getDatabase(), id);
    if (!resume) {
      return { success: false, error: 'Resume not found' };
    }
    return { success: true, data: resume };
  } catch (error) {
    console.error('Error fetching resume:', error);
    return { success: false, error: 'Failed to fetch resume' };
  }
});

ipcMain.handle('resume:generateTrue', async (_event, { ageOptimized }: { ageOptimized?: boolean }) => {
  try {
    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return { success: false, error: 'Claude API key not set. Please configure it in settings.' };
    }
    
    const database = getDatabase();
    const profile = getProfile(database);
    
    if (!profile) {
      return { success: false, error: 'Profile not found. Please create your profile first.' };
    }
    
    // Delete existing true resume if it exists
    const existingTrueResume = database.prepare('SELECT * FROM Resume WHERE isTrueResume = 1').get() as any;
    if (existingTrueResume) {
      deleteResume(database, existingTrueResume.id);
    }
    
    // Generate resume content using AI
    const skillsArray = Array.isArray(profile.skills) ? profile.skills : [];
    const resumeContent = await generateResumeContent(
      {
        workHistory: profile.workHistory as any[],
        skills: skillsArray,
        education: profile.education as any[],
        personalInfo: profile.personalInfo,
      },
      'General',
      ageOptimized || false,
      apiKey
    );
    
    // Create resume
    const resume = createResume(database, {
      profileId: profile.id,
      jobType: 'General',
      title: 'Original Resume',
      content: resumeContent,
      isActive: false,
      isTrueResume: true,
    });
    
    return { success: true, data: resume };
  } catch (error) {
    console.error('Error generating true resume:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate resume' };
  }
});

ipcMain.handle('resume:customize', async (_event, { jobTitle, companyName, jobDescription, ageOptimized }: { jobTitle: string; companyName: string; jobDescription: string; ageOptimized?: boolean }) => {
  try {
    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return { success: false, error: 'Claude API key not set. Please configure it in settings.' };
    }
    
    const database = getDatabase();
    const profile = getProfile(database);
    
    if (!profile) {
      return { success: false, error: 'Profile not found. Please create your profile first.' };
    }
    
    // Generate resume content using AI
    const skillsArray = Array.isArray(profile.skills) ? profile.skills : [];
    const resumeContent = await generateResumeContent(
      {
        workHistory: profile.workHistory as any[],
        skills: skillsArray,
        education: profile.education as any[],
        personalInfo: profile.personalInfo,
      },
      jobTitle,
      ageOptimized || false,
      apiKey
    );
    
    // Create resume
    const resume = createResume(database, {
      profileId: profile.id,
      jobType: jobTitle,
      title: `${jobTitle} - ${companyName}`,
      content: resumeContent,
      isActive: false,
      isTrueResume: false,
      jobDescription,
      companyName,
    });
    
    return { success: true, data: resume };
  } catch (error) {
    console.error('Error customizing resume:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to customize resume' };
  }
});

ipcMain.handle('resume:generate', async (_event, { jobType, ageOptimized }: { jobType: string; ageOptimized?: boolean }) => {
  try {
    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return { success: false, error: 'Claude API key not set. Please configure it in settings.' };
    }
    
    const database = getDatabase();
    const profile = getProfile(database);
    
    if (!profile) {
      return { success: false, error: 'Profile not found. Please create your profile first.' };
    }
    
    // Generate resume content using AI
    const skillsArray = Array.isArray(profile.skills) ? profile.skills : [];
    const resumeContent = await generateResumeContent(
      {
        workHistory: profile.workHistory as any[],
        skills: skillsArray,
        education: profile.education as any[],
        personalInfo: profile.personalInfo,
      },
      jobType,
      ageOptimized || false,
      apiKey
    );
    
    // Create resume
    const resume = createResume(database, {
      profileId: profile.id,
      jobType,
      title: `${jobType} Resume`,
      content: resumeContent,
      isActive: false,
      isTrueResume: false,
    });
    
    return { success: true, data: resume };
  } catch (error) {
    console.error('Error generating resume:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate resume' };
  }
});

ipcMain.handle('resume:update', async (_event, { id, data }: { id: string; data: any }) => {
  try {
    const resume = updateResume(getDatabase(), id, data);
    return { success: true, data: resume };
  } catch (error) {
    console.error('Error updating resume:', error);
    return { success: false, error: 'Failed to update resume' };
  }
});

ipcMain.handle('resume:delete', async (_event, id: string) => {
  try {
    deleteResume(getDatabase(), id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting resume:', error);
    return { success: false, error: 'Failed to delete resume' };
  }
});

ipcMain.handle('resume:setActive', async (_event, id: string) => {
  try {
    const resume = setActiveResume(getDatabase(), id);
    return { success: true, data: resume };
  } catch (error) {
    console.error('Error setting active resume:', error);
    return { success: false, error: 'Failed to set active resume' };
  }
});

// Cover letter handlers
ipcMain.handle('coverLetter:generate', async (_event, { resumeId, jobTitle, companyName, jobDescription, personality, length }: any) => {
  try {
    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return { success: false, error: 'Claude API key not set. Please configure it in settings.' };
    }
    
    const database = getDatabase();
    const resume = getResumeById(database, resumeId);
    
    if (!resume) {
      return { success: false, error: 'Resume not found' };
    }
    
    const personalityInstructions: Record<string, string> = {
      professional: "Use a professional, polished tone. Be confident but not overly casual.",
      friendly: "Use a warm, approachable, and friendly tone.",
      enthusiastic: "Use an energetic, passionate, and enthusiastic tone.",
      formal: "Use a formal, traditional business tone.",
      conversational: "Use a natural, conversational tone.",
    };
    
    const lengthInstructions: Record<string, string> = {
      short: "Keep it concise: 1-2 paragraphs, approximately 200-300 words.",
      medium: "Write 3-4 paragraphs, approximately 400-500 words.",
      long: "Write 5+ paragraphs, approximately 600+ words.",
    };
    
    const prompt = `Write a personalized cover letter for the position of ${jobTitle} at ${companyName}.

Resume Information:
${JSON.stringify(resume.content, null, 2)}

Job Description:
${jobDescription}

WRITING STYLE REQUIREMENTS:
- Personality/Tone: ${personalityInstructions[personality || 'professional']}
- Length: ${lengthInstructions[length || 'medium']}

CRITICAL RULES:
1. ONLY USE INFORMATION FROM THE RESUME: You may ONLY reference experiences, skills, education, and qualifications that are EXPLICITLY stated in the resume.
2. DO NOT MAKE UP EXPERIENCE: Never claim qualifications, technologies, tools, or experiences that are not explicitly listed in the resume.
3. BE TRUTHFUL AND ACCURATE: Never claim qualifications that are not explicitly listed in the resume.

Return only the cover letter text, no additional formatting or explanations.`;
    
    const content = await callClaude({
      system: "You are a professional cover letter writer. Write compelling, personalized cover letters. CRITICAL: You must ONLY use information explicitly stated in the resume provided. NEVER fabricate, infer, or assume any experience, skills, or qualifications.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 2048,
    });
    
    if (!content) {
      return { success: false, error: 'Failed to generate cover letter' };
    }
    
    // Save cover letter
    const coverLetter = createCoverLetter(database, {
      resumeId,
      jobTitle,
      companyName,
      jobDescription: jobDescription || null,
      content,
    });
    
    return { success: true, data: coverLetter };
  } catch (error) {
    console.error('Error generating cover letter:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate cover letter' };
  }
});

ipcMain.handle('coverLetter:list', async (_event, resumeId?: string) => {
  try {
    const database = getDatabase();
    let coverLetters;
    if (resumeId) {
      coverLetters = getCoverLetters(database, resumeId);
    } else {
      // Get all cover letters
      const stmt = database.prepare('SELECT * FROM CoverLetter ORDER BY createdAt DESC');
      const rows = stmt.all() as any[];
      coverLetters = rows.map(row => ({
        id: row.id,
        resumeId: row.resumeId,
        jobTitle: row.jobTitle,
        companyName: row.companyName,
        jobDescription: row.jobDescription,
        content: row.content,
        createdAt: new Date(row.createdAt),
      }));
    }
    return { success: true, data: coverLetters };
  } catch (error) {
    console.error('Error fetching cover letters:', error);
    return { success: false, error: 'Failed to fetch cover letters' };
  }
});

// Interview prep handlers
ipcMain.handle('interviewPrep:generate', async (_event, resumeId: string) => {
  try {
    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return { success: false, error: 'Claude API key not set. Please configure it in settings.' };
    }
    
    const database = getDatabase();
    const resume = getResumeById(database, resumeId);
    
    if (!resume) {
      return { success: false, error: 'Resume not found' };
    }
    
    const prompt = `Generate 10 relevant interview questions for a ${resume.jobType} position based on the following resume:

${JSON.stringify(resume.content, null, 2)}

Create a mix of:
- Behavioral questions (about past experiences)
- Technical questions (relevant to the role)
- Situational questions (hypothetical scenarios)
- Questions about the candidate's background

Return a JSON object with a "questions" array containing the question strings. No other text, only valid JSON.`;
    
    const content = await callClaude({
      system: "You are an interview coach. Generate relevant interview questions. Return only valid JSON with a top-level 'questions' array of question strings.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 2048,
    });
    
    if (!content) {
      return { success: false, error: 'Failed to generate questions' };
    }
    
    const parsed = parseJsonFromClaude(content);
    const questions = parsed.questions || [];
    
    // Save or update interview prep
    const interviewPrep = createOrUpdateInterviewPrep(database, resumeId, {
      questions: Array.isArray(questions) ? questions : [],
      notes: {},
    });
    
    return { success: true, data: interviewPrep };
  } catch (error) {
    console.error('Error generating interview prep:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate interview prep' };
  }
});

ipcMain.handle('interviewPrep:get', async (_event, resumeId: string) => {
  try {
    const interviewPrep = getInterviewPrep(getDatabase(), resumeId);
    return { success: true, data: interviewPrep };
  } catch (error) {
    console.error('Error fetching interview prep:', error);
    return { success: false, error: 'Failed to fetch interview prep' };
  }
});

ipcMain.handle('interviewPrep:update', async (_event, { resumeId, notes }: { resumeId: string; notes: any }) => {
  try {
    const existing = getInterviewPrep(getDatabase(), resumeId);
    const interviewPrep = createOrUpdateInterviewPrep(getDatabase(), resumeId, {
      notes,
      questions: existing?.questions || [],
    });
    return { success: true, data: interviewPrep };
  } catch (error) {
    console.error('Error updating interview prep:', error);
    return { success: false, error: 'Failed to update interview prep' };
  }
});

// Skills highlight handlers
ipcMain.handle('skillsHighlight:analyze', async (_event, { resumeId, jobDescription }: { resumeId: string; jobDescription: string }) => {
  try {
    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return { success: false, error: 'Claude API key not set. Please configure it in settings.' };
    }
    
    const database = getDatabase();
    const resume = getResumeById(database, resumeId);
    const profile = getProfile(database);
    
    if (!resume || !profile) {
      return { success: false, error: 'Resume or profile not found' };
    }
    
    // Handle skills as JSON array
    const skillsArray = Array.isArray(profile.skills) ? profile.skills : [];
    const prompt = `Analyze how the resume skills match the job description and provide optimization suggestions.

Resume Skills:
${skillsArray.join(", ")}

Resume Content:
${JSON.stringify(resume.content, null, 2)}

Job Description:
${jobDescription}

Provide a JSON response with:
{
  "matchedSkills": ["array of skills that match"],
  "missingSkills": ["array of skills mentioned in job but not in resume"],
  "suggestions": ["array of actionable suggestions to improve the resume"]
}
Return only valid JSON, no other text.`;
    
    const content = await callClaude({
      system: "You are a career coach. Analyze resume skills against job descriptions and provide actionable feedback. Return only valid JSON with matchedSkills, missingSkills, and suggestions arrays.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 2048,
    });
    
    if (!content) {
      return { success: false, error: 'Failed to analyze skills' };
    }
    
    const analysis = parseJsonFromClaude(content);
    
    // Save analysis
    const skillsHighlight = createOrUpdateSkillsHighlight(database, {
      resumeId,
      jobDescription,
      matchedSkills: analysis.matchedSkills || [],
      suggestions: analysis.suggestions || [],
    });
    
    return { success: true, data: skillsHighlight };
  } catch (error) {
    console.error('Error analyzing skills:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to analyze skills' };
  }
});

// Career coach chat handler
ipcMain.handle('coach:chat', async (_event, { systemPrompt, messages }: { systemPrompt: string; messages: { role: 'user' | 'assistant'; content: string }[] }) => {
  try {
    const content = await callClaude({
      system: systemPrompt,
      messages,
      maxTokens: 4096,
    });
    if (!content) {
      return { success: false, error: 'No response from coach' };
    }
    return { success: true, data: { content } };
  } catch (error) {
    console.error('Coach chat error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get coach response' };
  }
});

ipcMain.handle('skillsHighlight:list', async (_event, resumeId?: string) => {
  try {
    const database = getDatabase();
    let stmt;
    if (resumeId) {
      stmt = database.prepare('SELECT * FROM SkillsHighlight WHERE resumeId = ? ORDER BY createdAt DESC');
    } else {
      stmt = database.prepare('SELECT * FROM SkillsHighlight ORDER BY createdAt DESC');
    }
    const rows = (resumeId ? stmt.all(resumeId) : stmt.all()) as any[];
    const highlights = rows.map(row => ({
      id: row.id,
      resumeId: row.resumeId,
      jobDescription: row.jobDescription,
      matchedSkills: parseJson(row.matchedSkills),
      suggestions: parseJson(row.suggestions),
      createdAt: new Date(row.createdAt),
    }));
    return { success: true, data: highlights };
  } catch (error) {
    console.error('Error fetching skills highlights:', error);
    return { success: false, error: 'Failed to fetch skills highlights' };
  }
});

// File export handlers - Word document download
ipcMain.handle('resume:downloadWord', async (_event, resumeId: string) => {
  try {
    const database = getDatabase();
    const resume = getResumeById(database, resumeId);
    
    if (!resume) {
      return { success: false, error: 'Resume not found' };
    }
    
    const content = resume.content as any;
    if (!content) {
      return { success: false, error: 'Resume content not found' };
    }
    
    // Check if resume is age-optimized
    const isAgeOptimized = content.education && Array.isArray(content.education) && 
      content.education.length > 0 &&
      content.education.every((edu: any) => !edu.graduationDate || edu.graduationDate.trim() === "");
    
    // Build Word document sections
    const children: any[] = [];
    
    // Personal Information
    if (content.personalInfo) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: content.personalInfo.name || "",
              bold: true,
              size: 44,
              font: "Calibri",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );
      
      const contactParts: string[] = [];
      if (content.personalInfo.email) contactParts.push(content.personalInfo.email);
      if (content.personalInfo.phone) contactParts.push(content.personalInfo.phone);
      if (content.personalInfo.location) contactParts.push(content.personalInfo.location);
      
      if (contactParts.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: contactParts.join(" | "),
                size: 22,
                font: "Calibri",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 280 },
          })
        );
      }
    }
    
    // Professional Summary
    if (content.summary) {
      children.push(new Paragraph({ spacing: { after: 240 } }));
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "PROFESSIONAL SUMMARY",
              bold: true,
              size: 28,
              font: "Calibri",
              allCaps: true,
              underline: {
                type: "single",
                color: "000000",
              },
            }),
          ],
          spacing: { after: 120 },
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: content.summary,
              size: 22,
              font: "Calibri",
            }),
          ],
          spacing: { after: 360 },
        })
      );
    }
    
    // Core Competencies
    if (content.coreCompetencies && typeof content.coreCompetencies === 'string' && content.coreCompetencies.trim()) {
      const competencyLines = content.coreCompetencies
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
      if (competencyLines.length > 0) {
        children.push(new Paragraph({ spacing: { after: 240 } }));
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "CORE COMPETENCIES",
                bold: true,
                size: 28,
                font: "Calibri",
                allCaps: true,
                underline: { type: "single", color: "000000" },
              }),
            ],
            spacing: { after: 120 },
          })
        );
        competencyLines.forEach((line: string) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`,
                  size: 22,
                  font: "Calibri",
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        });
        children.push(new Paragraph({ spacing: { after: 240 } }));
      }
    }
    
    // Professional Experience
    if (content.workExperience && Array.isArray(content.workExperience) && content.workExperience.length > 0) {
      children.push(new Paragraph({ spacing: { after: 240 } }));
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "PROFESSIONAL EXPERIENCE",
              bold: true,
              size: 28,
              font: "Calibri",
              allCaps: true,
              underline: {
                type: "single",
                color: "000000",
              },
            }),
          ],
          spacing: { after: 120 },
        })
      );
      
      content.workExperience.forEach((exp: any, index: number) => {
        if (index > 0) {
          children.push(new Paragraph({ spacing: { after: 240 } }));
        }
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.title || "",
                bold: true,
                size: 24,
                font: "Calibri",
              }),
              ...(exp.company ? [
                new TextRun({
                  text: ` | ${exp.company}`,
                  bold: true,
                  size: 24,
                  font: "Calibri",
                }),
              ] : []),
            ],
          })
        );
        
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${exp.startDate || ""} - ${exp.endDate || "Present"}`,
                size: 20,
                font: "Calibri",
                italics: true,
              }),
            ],
            spacing: { after: 120 },
          })
        );
        
        if (exp.description) {
          const lines = exp.description
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);
          
          lines.forEach((line: string) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`,
                    size: 22,
                    font: "Calibri",
                  }),
                ],
                bullet: { level: 0 },
                spacing: { after: 80 },
              })
            );
          });
        }
      });
    }
    
    // Education and Certifications
    if (content.education && Array.isArray(content.education) && content.education.length > 0) {
      children.push(new Paragraph({ spacing: { after: 240 } }));
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "EDUCATION AND CERTIFICATIONS",
              bold: true,
              size: 28,
              font: "Calibri",
              allCaps: true,
              underline: {
                type: "single",
                color: "000000",
              },
            }),
          ],
          spacing: { after: 120 },
        })
      );
      
      content.education.forEach((edu: any, index: number) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.degree || "",
                bold: true,
                size: 24,
                font: "Calibri",
              }),
              ...(edu.school ? [
                new TextRun({
                  text: ` | ${edu.school}`,
                  bold: true,
                  size: 24,
                  font: "Calibri",
                }),
              ] : []),
            ],
            spacing: { after: 40 },
          })
        );
        
        if (!isAgeOptimized && edu.graduationDate) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: edu.graduationDate,
                  size: 20,
                  font: "Calibri",
                  italics: true,
                }),
              ],
              spacing: { after: index < content.education.length - 1 ? 120 : 240 },
            })
          );
        } else {
          children.push(new Paragraph({ spacing: { after: index < content.education.length - 1 ? 120 : 240 } }));
        }
      });
    }
    
    // Technical Proficiencies
    if (content.skills && Array.isArray(content.skills) && content.skills.length > 0) {
      children.push(new Paragraph({ spacing: { after: 240 } }));
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "TECHNICAL PROFICIENCIES",
              bold: true,
              size: 28,
              font: "Calibri",
              allCaps: true,
              underline: {
                type: "single",
                color: "000000",
              },
            }),
          ],
          spacing: { after: 120 },
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: content.skills.join(", "),
              size: 22,
              font: "Calibri",
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
    
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children,
        },
      ],
    });
    
    const buffer = await Packer.toBuffer(doc);
    
    // Use Electron dialog to save file
    let cleanFilename = (resume.jobType || "Resume")
      .trim()
      .replace(/[^a-z0-9\s]/gi, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    
    if (!cleanFilename || cleanFilename.length === 0) {
      cleanFilename = "Resume";
    }
    
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Save Resume',
      defaultPath: `${cleanFilename}.docx`,
      filters: [
        { name: 'Word Documents', extensions: ['docx'] },
      ],
    });
    
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, buffer);
      return { success: true, filePath: result.filePath };
    }
    
    return { success: false, error: 'Save cancelled' };
  } catch (error) {
    console.error('Error generating Word document:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate Word document' };
  }
});


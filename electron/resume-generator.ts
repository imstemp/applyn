import Anthropic from '@anthropic-ai/sdk';

export interface ProfileData {
  workHistory: any[];
  skills: string[];
  education: any[];
  personalInfo: any;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  if (/^\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${year}`;
  }
  return dateStr;
}

function getYearFromDate(dateStr: string): number | null {
  if (!dateStr) return null;
  if (/^\d{2}\/\d{4}$/.test(dateStr)) {
    return parseInt(dateStr.split("/")[1]);
  }
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.getFullYear();
  }
  return null;
}

function buildBaseResumeStructure(profileData: ProfileData, ageOptimized: boolean = false): any {
  const personalInfo = {
    name: profileData.personalInfo?.firstName && profileData.personalInfo?.lastName
      ? `${profileData.personalInfo.firstName} ${profileData.personalInfo.lastName}`
      : profileData.personalInfo?.name || "",
    email: profileData.personalInfo?.email || "",
    phone: profileData.personalInfo?.phone || "",
    location: profileData.personalInfo?.location || "",
  };

  let workHistory = profileData.workHistory || [];
  
  if (ageOptimized) {
    const currentYear = new Date().getFullYear();
    const cutoffYear = currentYear - 15;
    
    workHistory = workHistory.filter((work: any) => {
      const startYear = getYearFromDate(work.startDate || "");
      const endYear = work.endDate ? getYearFromDate(work.endDate) : currentYear;
      return (endYear && endYear >= cutoffYear) || !endYear;
    });
  }

  const workExperience = workHistory.map((work: any) => ({
    title: work.position || work.title || "",
    company: work.company || "",
    startDate: formatDate(work.startDate || ""),
    endDate: work.endDate ? formatDate(work.endDate) : "Present",
    description: work.description || "",
  }));

  const education = (profileData.education || []).map((edu: any) => ({
    degree: edu.degree || "",
    school: edu.institution || edu.school || "",
    field: edu.field || "",
    graduationDate: ageOptimized ? "" : (edu.graduationDate ? formatDate(edu.graduationDate) : ""),
  }));

  // Handle skills as JSON array (SQLite stores as JSON)
  const skillsArray = Array.isArray(profileData.skills) ? profileData.skills : [];
  const skills = [...skillsArray];

  return {
    personalInfo,
    workExperience,
    education,
    skills,
    summary: "",
    coreCompetencies: "",
  };
}

export async function generateResumeContent(
  profileData: ProfileData,
  jobType: string,
  ageOptimized: boolean,
  apiKey: string
): Promise<any> {
  const anthropic = new Anthropic({ apiKey });
  const baseResume = buildBaseResumeStructure(profileData, ageOptimized);
  const isGeneral = jobType === "General";
  
  const ageOptimizationInstructions = ageOptimized ? `
    
AGE OPTIMIZATION MODE - CRITICAL INSTRUCTIONS:
- MODERNIZE ALL LANGUAGE: Use contemporary, current industry terminology. Avoid dated phrases or old-fashioned language.
- FOCUS ON RECENT EXPERIENCE: Emphasize the most recent work experiences (last 10-15 years) in descriptions and summary.
- REMOVE AGE INDICATORS: Do not mention "years of experience" with specific numbers that might reveal age. Use phrases like "extensive experience" or "proven track record" instead.
- CONTEMPORARY TONE: Write in a fresh, modern, energetic tone that sounds current and forward-thinking.
- SKILLS-FOCUSED: Emphasize skills and achievements over chronological history.
- REMOVE OUTDATED REFERENCES: Do not reference old technologies, methodologies, or industry terms that are clearly outdated.
` : "";

  const prompt = isGeneral
    ? `You are an expert resume writer. Your task is to enhance ONLY the descriptions and create a professional summary. ALL factual data has already been preserved and will be merged back.
${ageOptimizationInstructions}
CRITICAL: You are ONLY enhancing descriptions and creating a summary. DO NOT return company names, job titles, dates, personal info, skills, or education - these are already preserved.

MANDATORY: You MUST return enhanced descriptions for EVERY work experience and EVERY education entry provided. The arrays you return must have the EXACT SAME LENGTH as the arrays in the Base Resume Structure.

Your task:
1. CREATE A PROFESSIONAL SUMMARY: Write a compelling 3-4 sentence summary that highlights the candidate's key strengths${ageOptimized ? ", proven expertise, and unique value proposition" : ", years of experience, and unique value proposition"}. Use powerful, confident language${ageOptimized ? " with a modern, contemporary tone" : ""}.

2. CREATE CORE COMPETENCIES: From the candidate's work history, skills, and experience in the Base Resume Structure below, derive 5-8 core competencies in "Title – Description" format. Do not invent competencies; each must be supported by their actual roles, achievements, or skills. Each line: a short bold-style title (e.g. "Team Leadership & Development"), then an em dash "–", then 1-2 sentences describing impact drawn from their experience (e.g. "Built and managed teams up to 15+ members; recruited, mentored, and developed talent"). Return as a single string with each competency on its own line starting with "• ".

3. ENHANCE WORK EXPERIENCE DESCRIPTIONS: For EACH AND EVERY work experience in the Base Resume Structure, enhance the description field only (you must return one enhanced description for each work experience):
   - Format as bullet points: Each achievement should be on its own line starting with "• " (bullet character)
   - Convert plain descriptions into achievement-focused bullet points
   - Use strong, modern action verbs (Led, Developed, Implemented, Optimized, Increased, etc.)${ageOptimized ? " - prefer contemporary, current industry terminology" : ""}
   - Add quantifiable results where possible (percentages, numbers, scale)
   - Make responsibilities sound more impactful and professional
   - Focus on achievements and outcomes, not just duties${ageOptimized ? "\n   - For older positions, emphasize transferable skills and modern relevance rather than dated specifics" : ""}
   - CRITICAL: Return the description as a multi-line string with each bullet point on a new line, starting with "• "

4. ENHANCE EDUCATION DESCRIPTIONS: Make education descriptions sound more professional and highlight relevant coursework or achievements if applicable.

Base Resume Structure (factual data already preserved):
${JSON.stringify(baseResume, null, 2)}

Return a JSON object with ONLY these fields:
{
  "summary": "A compelling, professional 3-4 sentence summary that makes the candidate sound impressive",
  "coreCompetencies": "• Title One – Brief description of impact and scope.\\n• Title Two – Brief description.\\n• (5-8 total, each line: • Title – Description using em dash – )",
  "workExperience": [
    {
      "description": "• Enhanced bullet point with action verbs and achievements for the FIRST work experience\n• Second bullet point highlighting key achievements\n• Third bullet point with quantifiable results"
    },
    {
      "description": "• Enhanced bullet point with action verbs and achievements for the SECOND work experience\n• Second bullet point highlighting key achievements\n• Third bullet point with quantifiable results"
    }
    // ... continue for ALL work experiences in the same order as provided
  ],
  "education": [
    {
      "description": "Enhanced education description (if applicable)"
    }
    // ... continue for ALL education entries in the same order as provided
  ]
}

CRITICAL REQUIREMENTS:
- You MUST return coreCompetencies as a string with 5-8 lines; each line starts with "• " and uses the format "Title – Description" (em dash between title and description).
- The workExperience array MUST contain exactly the same number of entries as provided in the Base Resume Structure
- Each entry in workExperience must correspond to the same position in the original array (first entry = first work experience, second entry = second work experience, etc.)
- The education array MUST contain exactly the same number of entries as provided in the Base Resume Structure
- Return ONLY the summary, coreCompetencies, and enhanced descriptions
- DO NOT include personalInfo, company names, job titles, dates, or skills in your response
- These will be merged with the preserved factual data
- Return only valid JSON.`
    : `You are an expert resume writer. Your task is to enhance ONLY the descriptions and create a professional summary optimized for ${jobType} positions. ALL factual data has already been preserved and will be merged back.
${ageOptimizationInstructions}
CRITICAL: You are ONLY enhancing descriptions and creating a summary. DO NOT return company names, job titles, dates, personal info, skills, or education - these are already preserved.

MANDATORY: You MUST return enhanced descriptions for EVERY work experience and EVERY education entry provided. The arrays you return must have the EXACT SAME LENGTH as the arrays in the Base Resume Structure.

Your task:
1. CREATE A TARGETED PROFESSIONAL SUMMARY: Write a compelling 3-4 sentence summary specifically tailored for ${jobType} roles, highlighting relevant experience and skills${ageOptimized ? " with a modern, contemporary tone" : ""}.

2. CREATE CORE COMPETENCIES: From the candidate's work history, skills, and experience in the Base Resume Structure below, derive 5-8 core competencies relevant to ${jobType} in "Title – Description" format. Do not invent competencies; each must be supported by their actual roles, achievements, or skills. Each line: short title, then em dash "–", then 1-2 sentences describing impact drawn from their experience. Return as a single string, each line starting with "• ".

3. ENHANCE WORK EXPERIENCE DESCRIPTIONS: For EACH AND EVERY work experience in the Base Resume Structure, enhance the description field only, emphasizing relevance to ${jobType} (you must return one enhanced description for each work experience):
   - Format as bullet points: Each achievement should be on its own line starting with "• " (bullet character)
   - Convert plain descriptions into achievement-focused bullet points
   - Use strong, modern action verbs (Led, Developed, Implemented, Optimized, Increased, etc.)${ageOptimized ? " - prefer contemporary, current industry terminology" : ""}
   - Emphasize experiences most relevant to ${jobType} roles${ageOptimized ? " - prioritize recent experiences" : ""}
   - Add quantifiable results where possible
   - Make responsibilities sound more impactful and professional
   - Focus on achievements and outcomes relevant to ${jobType}${ageOptimized ? "\n   - For older positions, emphasize transferable skills and modern relevance rather than dated specifics" : ""}
   - CRITICAL: Return the description as a multi-line string with each bullet point on a new line, starting with "• "

4. ENHANCE EDUCATION DESCRIPTIONS: Make education descriptions sound professional and highlight any coursework or achievements relevant to ${jobType}.

Base Resume Structure (factual data already preserved):
${JSON.stringify(baseResume, null, 2)}

Return a JSON object with ONLY these fields:
{
  "summary": "A compelling, professional summary tailored for ${jobType} roles",
  "coreCompetencies": "• Title One – Description relevant to ${jobType}.\\n• Title Two – Description.\\n• (5-8 total, each line: • Title – Description with em dash – )",
  "workExperience": [
    {
      "description": "• Enhanced bullet point with action verbs and achievements relevant to ${jobType} for the FIRST work experience\n• Second bullet point highlighting key achievements relevant to ${jobType}\n• Third bullet point with quantifiable results"
    },
    {
      "description": "• Enhanced bullet point with action verbs and achievements relevant to ${jobType} for the SECOND work experience\n• Second bullet point highlighting key achievements relevant to ${jobType}\n• Third bullet point with quantifiable results"
    }
    // ... continue for ALL work experiences in the same order as provided
  ],
  "education": [
    {
      "description": "Enhanced education description (if applicable)"
    }
    // ... continue for ALL education entries in the same order as provided
  ]
}

CRITICAL REQUIREMENTS:
- You MUST return coreCompetencies as a string with 5-8 lines; each line starts with "• " and uses "Title – Description" format (em dash between title and description).
- The workExperience array MUST contain exactly the same number of entries as provided in the Base Resume Structure
- Each entry in workExperience must correspond to the same position in the original array (first entry = first work experience, second entry = second work experience, etc.)
- The education array MUST contain exactly the same number of entries as provided in the Base Resume Structure
- Return ONLY the summary, coreCompetencies, and enhanced descriptions
- DO NOT include personalInfo, company names, job titles, dates, or skills in your response
- These will be merged with the preserved factual data
- Return only valid JSON.`;

  const systemPrompt = `You are an expert resume writer with 20+ years of experience. Your specialty is transforming raw information into polished, professional resumes that sound impressive and compelling. You excel at using strong action verbs, achievement-focused language, and industry-standard terminology to make candidates stand out.${ageOptimized ? " SPECIAL FOCUS: You specialize in creating age-optimized resumes that emphasize modern skills, contemporary language, and recent achievements while maintaining professionalism and truthfulness." : ""} CRITICAL RULE: You must preserve ALL factual information EXACTLY as provided - company names (including LLC, Inc., Corp., etc.), job titles/positions, personal information, dates, institution names, degree names. NEVER change, shorten, remove suffixes, or 'improve' factual data. Only enhance descriptions and summaries - factual data must remain identical to the source. FORMATTING RULE: All work experience descriptions MUST be formatted as bullet points, with each bullet on a new line starting with "• " (bullet character followed by space).`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content?.[0];
  const content = textBlock && textBlock.type === "text" ? textBlock.text : null;
  if (!content) {
    throw new Error("Failed to generate resume content - no response from Claude");
  }

  try {
    const trimmed = content.trim();
    const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
    const jsonStr = codeBlock ? codeBlock[1].trim() : trimmed;
    const aiEnhancements = JSON.parse(jsonStr);
    
    // Ensure we preserve all work experiences even if AI doesn't return all of them
    const aiWorkExperience = aiEnhancements.workExperience || [];
    const finalResume = {
      personalInfo: baseResume.personalInfo,
      summary: aiEnhancements.summary || "",
      coreCompetencies: aiEnhancements.coreCompetencies || "",
      workExperience: baseResume.workExperience.map((exp: any, index: number) => {
        const enhancement = aiWorkExperience[index];
        return {
          ...exp,
          description: enhancement?.description || exp.description || "",
        };
      }),
      education: baseResume.education.map((edu: any, index: number) => {
        const enhancement = aiEnhancements.education?.[index];
        return {
          ...edu,
          description: enhancement?.description || "",
        };
      }),
      skills: baseResume.skills,
    };

    // Log warning if AI didn't return all work experiences
    if (aiWorkExperience.length < baseResume.workExperience.length) {
      console.warn(`AI returned ${aiWorkExperience.length} work experience enhancements but ${baseResume.workExperience.length} were provided. Preserving all original work experiences.`);
    }

    return finalResume;
  } catch (parseError) {
    console.error("Failed to parse Claude response:", content);
    throw new Error("Failed to parse resume content from AI response");
  }
}


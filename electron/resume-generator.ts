import OpenAI from 'openai';

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
  };
}

export async function generateResumeContent(
  profileData: ProfileData,
  jobType: string,
  ageOptimized: boolean,
  apiKey: string
): Promise<any> {
  const openai = new OpenAI({ apiKey });
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

2. ENHANCE WORK EXPERIENCE DESCRIPTIONS: For EACH AND EVERY work experience in the Base Resume Structure, enhance the description field only (you must return one enhanced description for each work experience):
   - Format as bullet points: Each achievement should be on its own line starting with "• " (bullet character)
   - Convert plain descriptions into achievement-focused bullet points
   - Use strong, modern action verbs (Led, Developed, Implemented, Optimized, Increased, etc.)${ageOptimized ? " - prefer contemporary, current industry terminology" : ""}
   - Add quantifiable results where possible (percentages, numbers, scale)
   - Make responsibilities sound more impactful and professional
   - Focus on achievements and outcomes, not just duties${ageOptimized ? "\n   - For older positions, emphasize transferable skills and modern relevance rather than dated specifics" : ""}
   - CRITICAL: Return the description as a multi-line string with each bullet point on a new line, starting with "• "

3. ENHANCE EDUCATION DESCRIPTIONS: Make education descriptions sound more professional and highlight relevant coursework or achievements if applicable.

Base Resume Structure (factual data already preserved):
${JSON.stringify(baseResume, null, 2)}

Return a JSON object with ONLY these fields:
{
  "summary": "A compelling, professional 3-4 sentence summary that makes the candidate sound impressive",
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
- The workExperience array MUST contain exactly the same number of entries as provided in the Base Resume Structure
- Each entry in workExperience must correspond to the same position in the original array (first entry = first work experience, second entry = second work experience, etc.)
- The education array MUST contain exactly the same number of entries as provided in the Base Resume Structure
- Return ONLY the summary and enhanced descriptions
- DO NOT include personalInfo, company names, job titles, dates, or skills in your response
- These will be merged with the preserved factual data
- Return only valid JSON.`
    : `You are an expert resume writer. Your task is to enhance ONLY the descriptions and create a professional summary optimized for ${jobType} positions. ALL factual data has already been preserved and will be merged back.
${ageOptimizationInstructions}
CRITICAL: You are ONLY enhancing descriptions and creating a summary. DO NOT return company names, job titles, dates, personal info, skills, or education - these are already preserved.

MANDATORY: You MUST return enhanced descriptions for EVERY work experience and EVERY education entry provided. The arrays you return must have the EXACT SAME LENGTH as the arrays in the Base Resume Structure.

Your task:
1. CREATE A TARGETED PROFESSIONAL SUMMARY: Write a compelling 3-4 sentence summary specifically tailored for ${jobType} roles, highlighting relevant experience and skills${ageOptimized ? " with a modern, contemporary tone" : ""}.

2. ENHANCE WORK EXPERIENCE DESCRIPTIONS: For EACH AND EVERY work experience in the Base Resume Structure, enhance the description field only, emphasizing relevance to ${jobType} (you must return one enhanced description for each work experience):
   - Format as bullet points: Each achievement should be on its own line starting with "• " (bullet character)
   - Convert plain descriptions into achievement-focused bullet points
   - Use strong, modern action verbs (Led, Developed, Implemented, Optimized, Increased, etc.)${ageOptimized ? " - prefer contemporary, current industry terminology" : ""}
   - Emphasize experiences most relevant to ${jobType} roles${ageOptimized ? " - prioritize recent experiences" : ""}
   - Add quantifiable results where possible
   - Make responsibilities sound more impactful and professional
   - Focus on achievements and outcomes relevant to ${jobType}${ageOptimized ? "\n   - For older positions, emphasize transferable skills and modern relevance rather than dated specifics" : ""}
   - CRITICAL: Return the description as a multi-line string with each bullet point on a new line, starting with "• "

3. ENHANCE EDUCATION DESCRIPTIONS: Make education descriptions sound professional and highlight any coursework or achievements relevant to ${jobType}.

Base Resume Structure (factual data already preserved):
${JSON.stringify(baseResume, null, 2)}

Return a JSON object with ONLY these fields:
{
  "summary": "A compelling, professional summary tailored for ${jobType} roles",
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
- The workExperience array MUST contain exactly the same number of entries as provided in the Base Resume Structure
- Each entry in workExperience must correspond to the same position in the original array (first entry = first work experience, second entry = second work experience, etc.)
- The education array MUST contain exactly the same number of entries as provided in the Base Resume Structure
- Return ONLY the summary and enhanced descriptions
- DO NOT include personalInfo, company names, job titles, dates, or skills in your response
- These will be merged with the preserved factual data
- Return only valid JSON.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert resume writer with 20+ years of experience. Your specialty is transforming raw information into polished, professional resumes that sound impressive and compelling. You excel at using strong action verbs, achievement-focused language, and industry-standard terminology to make candidates stand out.${ageOptimized ? " SPECIAL FOCUS: You specialize in creating age-optimized resumes that emphasize modern skills, contemporary language, and recent achievements while maintaining professionalism and truthfulness." : ""} CRITICAL RULE: You must preserve ALL factual information EXACTLY as provided - company names (including LLC, Inc., Corp., etc.), job titles/positions, personal information, dates, institution names, degree names. NEVER change, shorten, remove suffixes, or 'improve' factual data. Only enhance descriptions and summaries - factual data must remain identical to the source. FORMATTING RULE: All work experience descriptions MUST be formatted as bullet points, with each bullet on a new line starting with "• " (bullet character followed by space).`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to generate resume content - no response from OpenAI");
  }

  try {
    const aiEnhancements = JSON.parse(content);
    
    // Ensure we preserve all work experiences even if AI doesn't return all of them
    const aiWorkExperience = aiEnhancements.workExperience || [];
    const finalResume = {
      personalInfo: baseResume.personalInfo,
      summary: aiEnhancements.summary || "",
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
    console.error("Failed to parse OpenAI response:", content);
    throw new Error("Failed to parse resume content from AI response");
  }
}


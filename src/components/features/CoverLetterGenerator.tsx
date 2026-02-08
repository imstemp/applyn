import { useState, useEffect } from "react";
import ActiveResumeSelector from "@/components/dashboard/ActiveResumeSelector";
import { Resume } from "@/types";
import { api } from "@/lib/api";

export default function CoverLetterGenerator() {
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [personality, setPersonality] = useState<"professional" | "friendly" | "enthusiastic" | "formal" | "conversational">("professional");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [generatedLetter, setGeneratedLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!generatedLetter) return;
    try {
      await navigator.clipboard.writeText(generatedLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Failed to copy to clipboard");
    }
  };

  const handleDownloadWord = async () => {
    if (!generatedLetter) return;
    try {
      const response = await api.coverLetter.downloadWord({
        content: generatedLetter,
        jobTitle,
        companyName,
      });
      if (response.success && response.filePath) {
        alert(`Cover letter saved to: ${response.filePath}`);
      } else if (!response.success && response.error && response.error !== "Save cancelled") {
        alert(response.error);
      }
    } catch (error) {
      console.error("Error downloading cover letter:", error);
      alert("An error occurred while downloading");
    }
  };

  // Auto-fill fields when a customized resume is selected
  useEffect(() => {
    if (activeResume && !activeResume.isTrueResume) {
      if (activeResume.jobType) {
        setJobTitle(activeResume.jobType);
      }
      if (activeResume.companyName) {
        setCompanyName(activeResume.companyName);
      }
      if (activeResume.jobDescription) {
        setJobDescription(activeResume.jobDescription);
      }
    }
  }, [activeResume]);

  const handleGenerate = async () => {
    if (!activeResume) {
      alert("Please select an active resume first");
      return;
    }

    if (!jobTitle || !companyName || !jobDescription.trim()) {
      alert("Please fill in job title, company name, and job description");
      return;
    }

    setLoading(true);
    try {
      const response = await api.coverLetter.generate({
        resumeId: activeResume.id,
        jobTitle,
        companyName,
        jobDescription,
        additionalInfo: additionalInfo.trim() || undefined,
        personality,
        length,
      });

      if (response.success && response.data) {
        setGeneratedLetter(response.data.content);
        setSaved(false);
      } else {
        alert(response.error || "Failed to generate cover letter");
      }
    } catch (error) {
      console.error("Error generating cover letter:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Cover Letter Generator</h1>
        <p className="text-blue-50 text-lg">
          Generate personalized cover letters tailored to specific job applications.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Resume Selection</h2>
        </div>
        <div className="p-6">
          <ActiveResumeSelector onSelect={setActiveResume} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Job Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Job Title *</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Senior Software Engineer"
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Company Name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Tech Corp"
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Job Description *</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
              rows={6}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Additional Information</label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="e.g., referral name, specific requirements to address, company research, or other context..."
              className="w-full border border-slate-300 rounded-xl px-4 py-3"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Personality</label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value as any)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="formal">Formal</option>
                <option value="conversational">Conversational</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Length</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as any)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3"
              >
                <option value="short">Short (200-300 words)</option>
                <option value="medium">Medium (400-500 words)</option>
                <option value="long">Long (600+ words)</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !activeResume}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 shadow-md hover:shadow-lg font-semibold"
          >
            {loading ? "Generating..." : "Generate Cover Letter"}
          </button>
        </div>
      </div>

      {generatedLetter && (
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Generated Cover Letter</h2>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 text-sm font-medium"
              >
                {copied ? "Copied!" : "Copy Text"}
              </button>
              <button
                onClick={handleDownloadWord}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium"
              >
                Download Word
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-slate-700">{generatedLetter}</div>
            </div>
            {saved && (
              <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-xl">
                Cover letter saved successfully!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




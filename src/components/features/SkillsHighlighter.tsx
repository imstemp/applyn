import { useState, useEffect } from "react";
import ActiveResumeSelector from "@/components/dashboard/ActiveResumeSelector";
import { Resume } from "@/types";
import { api } from "@/lib/api";

export default function SkillsHighlighter() {
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeResume && !activeResume.isTrueResume && activeResume.jobDescription) {
      setJobDescription(activeResume.jobDescription);
    }
  }, [activeResume]);

  const handleAnalyze = async () => {
    if (!activeResume) {
      alert("Please select an active resume first");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter a job description");
      return;
    }

    setLoading(true);
    try {
      const response = await api.skillsHighlight.analyze({
        resumeId: activeResume.id,
        jobDescription: jobDescription.trim(),
      });

      if (response.success && response.data) {
        setAnalysis(response.data);
      } else {
        alert(response.error || "Failed to analyze skills");
      }
    } catch (error) {
      console.error("Error analyzing skills:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Skills Highlighter</h1>
        <p className="text-purple-50 text-lg">
          Analyze how your skills match job descriptions and get optimization suggestions.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Resume Selection</h2>
        </div>
        <div className="p-6">
          <ActiveResumeSelector onSelect={setActiveResume} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Job Description</h2>
        </div>
        <div className="p-6 space-y-4">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            className="w-full border border-slate-300 rounded-xl px-4 py-3"
            rows={8}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !activeResume}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 shadow-md hover:shadow-lg font-semibold"
          >
            {loading ? "Analyzing..." : "Analyze Skills Match"}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Analysis Results</h2>
          </div>
          <div className="p-6 space-y-6">
            {analysis.matchedSkills && Array.isArray(analysis.matchedSkills) && analysis.matchedSkills.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-green-700 mb-2">Matched Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.matchedSkills.map((skill: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.missingSkills && Array.isArray(analysis.missingSkills) && analysis.missingSkills.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-yellow-700 mb-2">Missing Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.missingSkills.map((skill: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.suggestions && Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-blue-700 mb-2">Suggestions</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-700">
                  {analysis.suggestions.map((suggestion: string, idx: number) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




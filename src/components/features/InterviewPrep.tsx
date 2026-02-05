import { useState, useEffect } from "react";
import ActiveResumeSelector from "@/components/dashboard/ActiveResumeSelector";
import { Resume } from "@/types";
import { api } from "@/lib/api";

export default function InterviewPrep() {
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeResume) {
      loadInterviewPrep();
    }
  }, [activeResume]);

  const loadInterviewPrep = async () => {
    if (!activeResume) return;

    try {
      const response = await api.interviewPrep.get(activeResume.id);
      if (response.success && response.data) {
        setQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
        setNotes(response.data.notes || {});
      }
    } catch (error) {
      console.error("Error loading interview prep:", error);
    }
  };

  const handleGenerate = async () => {
    if (!activeResume) {
      alert("Please select an active resume first");
      return;
    }

    setLoading(true);
    try {
      const response = await api.interviewPrep.generate(activeResume.id);
      if (response.success && response.data) {
        setQuestions(Array.isArray(response.data.questions) ? response.data.questions : []);
        setNotes(response.data.notes || {});
      } else {
        alert(response.error || "Failed to generate questions");
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!activeResume) return;

    setSaving(true);
    try {
      const response = await api.interviewPrep.update({
        resumeId: activeResume.id,
        notes,
      });
      if (response.success) {
        alert("Notes saved successfully!");
      } else {
        alert(response.error || "Failed to save notes");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Interview Preparation</h1>
        <p className="text-green-50 text-lg">
          Practice with AI-generated interview questions tailored to your resume.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-green-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Resume Selection</h2>
        </div>
        <div className="p-6">
          <ActiveResumeSelector onSelect={setActiveResume} />
        </div>
      </div>

      {activeResume && (
        <>
          <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Interview Questions</h2>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Questions"}
              </button>
            </div>
            <div className="p-6">
              {questions.length === 0 ? (
                <p className="text-slate-700">Click "Generate Questions" to create interview questions based on your resume.</p>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={index} className="border border-slate-200 rounded-xl p-4">
                      <h3 className="font-semibold text-slate-800 mb-2">{question}</h3>
                      <textarea
                        value={notes[index] || ""}
                        onChange={(e) => setNotes({ ...notes, [index]: e.target.value })}
                        placeholder="Write your answer here..."
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 mt-2"
                        rows={4}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {questions.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Notes"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}



import { useState, useEffect } from "react";
import { Resume } from "@/types";
import { api } from "@/lib/api";

interface ActiveResumeSelectorProps {
  onSelect: (resume: Resume | null) => void;
}

export default function ActiveResumeSelector({ onSelect }: ActiveResumeSelectorProps) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [activeResume, setActiveResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResumes();
  }, []);

  // Re-load when app window becomes visible again (e.g. after being minimized/hidden)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadResumes();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const loadResumes = async (retryCount = 0) => {
    const maxRetries = 3;
    const retryDelays = [0, 400, 1200];
    setLoading(true);
    try {
      if (retryCount > 0 && retryDelays[retryCount] !== undefined) {
        await new Promise((r) => setTimeout(r, retryDelays[retryCount]));
      }
      const response = await api.resume.list();
      if (response.success && response.data) {
        setResumes(response.data);
        const active = response.data.find((r: Resume) => r.isActive);
        if (active) {
          setActiveResume(active);
          onSelect(active);
        }
        return;
      }
      if (retryCount < maxRetries - 1) {
        loadResumes(retryCount + 1);
        return;
      }
    } catch (error) {
      console.error("Error loading resumes:", error);
      if (retryCount < maxRetries - 1) {
        loadResumes(retryCount + 1);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (resume: Resume) => {
    try {
      const response = await api.resume.setActive(resume.id);
      if (response.success) {
        setActiveResume(resume);
        onSelect(resume);
        await loadResumes();
      }
    } catch (error) {
      console.error("Error setting active resume:", error);
    }
  };

  if (loading) {
    return <div className="text-slate-700">Loading resumes...</div>;
  }

  if (resumes.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800">
        <p className="font-semibold">No resumes found</p>
        <p className="text-sm mt-1">Please generate a resume from your profile first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        Select Active Resume
      </label>
      <select
        value={activeResume?.id || ""}
        onChange={(e) => {
          const selected = resumes.find((r) => r.id === e.target.value);
          if (selected) {
            handleSelect(selected);
          }
        }}
        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
      >
        <option value="">Select a resume...</option>
        {resumes.map((resume) => (
          <option key={resume.id} value={resume.id}>
            {resume.jobType} {resume.isTrueResume ? "(Original)" : `- ${resume.companyName || ""}`}
          </option>
        ))}
      </select>
      {activeResume && (
        <p className="text-sm text-slate-700 mt-2">
          Active: <span className="font-semibold">{activeResume.jobType}</span>
        </p>
      )}
    </div>
  );
}



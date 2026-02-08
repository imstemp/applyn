import { useState, useEffect } from "react";
import { Resume } from "@/types";
import { api } from "@/lib/api";

interface ResumeViewerProps {
  resumeId: string;
  onClose: () => void;
  onUpdate?: () => void;
  /** When true, only View and Download are shown (no Edit). Used for the General Original resume. */
  readOnly?: boolean;
}

export default function ResumeViewer({ resumeId, onClose, onUpdate, readOnly = false }: ResumeViewerProps) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedJobType, setEditedJobType] = useState("");

  useEffect(() => {
    loadResume();
  }, [resumeId]);

  useEffect(() => {
    if (readOnly && editing) setEditing(false);
  }, [readOnly, editing]);

  const loadResume = async () => {
    if (!resumeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.resume.get(resumeId);
      if (response.success && response.data) {
        setResume(response.data);
        setEditedContent(response.data.content);
        setEditedTitle(response.data.title || "");
        setEditedJobType(response.data.jobType || "");
      } else {
        console.error("Error loading resume:", response.error);
        setResume(null);
        // Resume was likely replaced (e.g. Original Resume regenerated) — close viewer so parent can refresh
        onClose();
      }
    } catch (error) {
      console.error("Error loading resume:", error);
      setResume(null);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resume) return;

    setSaving(true);
    try {
      const response = await api.resume.update({
        id: resumeId,
        data: {
          content: editedContent,
          title: editedTitle,
          jobType: editedJobType,
        },
      });

      if (response.success) {
        setEditing(false);
        if (onUpdate) {
          onUpdate();
        }
        await loadResume();
      } else {
        alert(response.error || "Failed to save resume");
      }
    } catch (error) {
      console.error("Error saving resume:", error);
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!resume) return;

    try {
      const response = await api.resume.downloadWord(resumeId);
      if (response.success) {
        alert(`Resume saved to: ${response.filePath}`);
      } else {
        alert(response.error || "Failed to download resume");
      }
    } catch (error) {
      console.error("Error downloading resume:", error);
      alert("An error occurred while downloading");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <p className="text-slate-700">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md">
          <p className="text-red-600 mb-4">Resume not found</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const content = resume.content || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">
            {editing ? "Edit Resume" : "View Resume"}
          </h2>
          <div className="flex gap-2">
            {!editing && (
              <>
                {!readOnly && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={handleDownloadWord}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700"
                >
                  Download Word
                </button>
              </>
            )}
            {editing && !readOnly && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    loadResume();
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Job Type</label>
                <input
                  type="text"
                  value={editedJobType}
                  onChange={(e) => setEditedJobType(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Content (JSON)</label>
                <textarea
                  value={JSON.stringify(editedContent, null, 2)}
                  onChange={(e) => {
                    try {
                      setEditedContent(JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, keep as is
                    }
                  }}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 font-mono text-sm"
                  rows={20}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-slate-900">
              {/* Personal Info */}
              {content.personalInfo && (
                <div>
                  <h3 className="text-xl font-bold mb-2 text-slate-900">{content.personalInfo.name}</h3>
                  <p className="text-slate-700">
                    {content.personalInfo.email} | {content.personalInfo.phone} | {content.personalInfo.location}
                  </p>
                </div>
              )}

              {/* 1. Professional Summary */}
              {content.summary && (
                <div>
                  <h3 className="text-lg font-bold mb-2 text-slate-900">Professional Summary</h3>
                  <p className="text-slate-700">{content.summary}</p>
                </div>
              )}

              {/* 2. Core Competencies (Title – Description format) */}
              {content.coreCompetencies && (
                <div>
                  <h3 className="text-lg font-bold mb-2 text-slate-900">Core Competencies</h3>
                  <div className="text-slate-700 space-y-1.5">
                    {content.coreCompetencies.split('\n').map((line: string, lineIdx: number) => {
                      const trimmedLine = line.trim();
                      if (!trimmedLine) return null;
                      const text = trimmedLine.startsWith('•') || trimmedLine.startsWith('-') ? trimmedLine.slice(1).trim() : trimmedLine;
                      const dashIdx = text.indexOf(' – ');
                      if (dashIdx !== -1) {
                        const title = text.slice(0, dashIdx).trim();
                        const description = text.slice(dashIdx + 3).trim();
                        return (
                          <p key={lineIdx} className="mb-1">
                            <span className="font-semibold text-slate-900">• {title}</span>
                            {description && <><span className="text-slate-700"> – </span><span>{description}</span></>}
                          </p>
                        );
                      }
                      return <p key={lineIdx} className="mb-1">• {text}</p>;
                    })}
                  </div>
                </div>
              )}

              {/* 3. Professional Experience */}
              {content.workExperience && Array.isArray(content.workExperience) && content.workExperience.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-2 text-slate-900">Professional Experience</h3>
                  {content.workExperience.map((exp: any, idx: number) => (
                    <div key={idx} className="mb-4">
                      <h4 className="font-semibold text-slate-900">{exp.title} at {exp.company}</h4>
                      <p className="text-sm text-slate-700">{exp.startDate} - {exp.endDate || "Present"}</p>
                      {exp.description && (
                        <div className="text-slate-700 mt-2">
                          {exp.description.split('\n').map((line: string, lineIdx: number) => {
                            const trimmedLine = line.trim();
                            if (!trimmedLine) return null;
                            const text = trimmedLine.startsWith('•') || trimmedLine.startsWith('-') ? trimmedLine.slice(1).trim() : trimmedLine;
                            return <p key={lineIdx} className="mb-1">• {text}</p>;
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Education and Certifications */}
              {content.education && Array.isArray(content.education) && content.education.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-2 text-slate-900">Education and Certifications</h3>
                  {content.education.map((edu: any, idx: number) => (
                    <div key={idx} className="mb-2">
                      <h4 className="font-semibold text-slate-900">{edu.degree} - {edu.school}</h4>
                      {edu.graduationDate && <p className="text-sm text-slate-700">{edu.graduationDate}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* 5. Technical Proficiencies */}
              {content.skills && Array.isArray(content.skills) && content.skills.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-2 text-slate-900">Technical Proficiencies</h3>
                  <p className="text-slate-700">{content.skills.join(", ")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



import { useState, useEffect } from "react";
import { Resume } from "@/types";
import ResumeViewer from "./ResumeViewer";
import { api } from "@/lib/api";

export default function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingTrue, setGeneratingTrue] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [viewingResumeId, setViewingResumeId] = useState<string | null>(null);
  
  // Customize form state
  const [showCustomizeForm, setShowCustomizeForm] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [ageOptimized, setAgeOptimized] = useState(false);
  const [ageOptimizedCustom, setAgeOptimizedCustom] = useState(false);

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    setLoading(true);
    try {
      const response = await api.resume.list();
      if (response.success && response.data) {
        setResumes(response.data);
      }
    } catch (error) {
      console.error("Error loading resumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTrueResume = async () => {
    setGeneratingTrue(true);
    try {
      const response = await api.resume.generateTrue({ ageOptimized });

      if (response.success) {
        await loadResumes();
        alert("Original resume generated successfully!");
      } else {
        alert(response.error || "Failed to generate original resume");
      }
    } catch (error) {
      console.error("Error generating true resume:", error);
      alert("An error occurred");
    } finally {
      setGeneratingTrue(false);
    }
  };

  const handleCustomize = async () => {
    if (!jobTitle.trim() || !companyName.trim() || !jobDescription.trim()) {
      alert("Please fill in job title, company name, and job description");
      return;
    }

    setCustomizing(true);
    try {
      const response = await api.resume.customize({
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        jobDescription: jobDescription.trim(),
        ageOptimized: ageOptimizedCustom,
      });

      if (response.success) {
        await loadResumes();
        setJobTitle("");
        setCompanyName("");
        setJobDescription("");
        setAgeOptimizedCustom(false);
        setShowCustomizeForm(false);
        alert("Customized resume created successfully!");
      } else {
        alert(response.error || "Failed to create customized resume");
      }
    } catch (error) {
      console.error("Error customizing resume:", error);
      alert("An error occurred");
    } finally {
      setCustomizing(false);
    }
  };

  const handleSetActive = async (resumeId: string) => {
    try {
      const response = await api.resume.setActive(resumeId);
      if (response.success) {
        loadResumes();
      }
    } catch (error) {
      console.error("Error setting active resume:", error);
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) {
      return;
    }

    try {
      const response = await api.resume.delete(resumeId);
      if (response.success) {
        setResumes(resumes.filter((r) => r.id !== resumeId));
      }
    } catch (error) {
      console.error("Error deleting resume:", error);
    }
  };

  const originalResume = resumes.find((r) => r.isTrueResume);
  const customizedResumes = resumes.filter((r) => !r.isTrueResume);

  return (
    <div className="space-y-6">
      {/* Generate Original Resume Section */}
      {!originalResume ? (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-soft border border-blue-200/50 p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            Generate Your Original Resume
          </h2>
          <p className="text-slate-700 mb-4">
            Create your polished, professional resume from your profile information. AI will enhance your content to make it sound more impressive and compelling. This will be your foundation resume that you can customize for specific jobs.
          </p>
          <div className="mb-4 p-4 bg-white/60 rounded-lg border border-blue-200">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={ageOptimized}
                onChange={(e) => setAgeOptimized(e.target.checked)}
                className="mt-1 mr-3 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800">Age-Optimized Resume</span>
                <p className="text-sm text-slate-700 mt-1">
                  Optimize your resume to appear more youthful on paper. This will focus on your last 10-15 years of experience, modernize language, remove graduation dates, and use contemporary terminology to help you compete in today's job market.
                </p>
              </div>
            </label>
          </div>
          <button
            onClick={handleGenerateTrueResume}
            disabled={generatingTrue}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
          >
            {generatingTrue ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              "Generate Original Resume"
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Customize Resume Section */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-soft border border-purple-200/50 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              Customize Resume for a Job
            </h2>
            <p className="text-slate-700 mb-4">
              Create a customized version of your resume tailored for a specific job application.
            </p>
            {!showCustomizeForm ? (
              <button
                onClick={() => setShowCustomizeForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
              >
                Customize for Job
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Tech Corp"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Job Description *
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here. This is required so AI can customize your resume to match the position requirements."
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                    rows={6}
                    required
                  />
                  <p className="mt-2 text-xs text-slate-700">
                    The job description is required to generate a customized resume tailored to the position.
                  </p>
                </div>
                <div className="p-4 bg-white/60 rounded-lg border border-purple-200">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageOptimizedCustom}
                      onChange={(e) => setAgeOptimizedCustom(e.target.checked)}
                      className="mt-1 mr-3 w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Age-Optimized Resume</span>
                      <p className="text-sm text-slate-700 mt-1">
                        Optimize this customized resume to appear more youthful. Focus on recent experience, modernize language, and use contemporary terminology.
                      </p>
                    </div>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCustomize}
                    disabled={customizing}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold"
                  >
                    {customizing ? "Customizing..." : "Create Customized Resume"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomizeForm(false);
                      setJobTitle("");
                      setCompanyName("");
                      setJobDescription("");
                      setAgeOptimizedCustom(false);
                    }}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all duration-200 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Original Resume Display */}
          <div className="bg-white rounded-xl shadow-soft border border-slate-200/50 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Your Original Resume</h2>
            {originalResume && (
              <div
                className={`border rounded-xl p-5 transition-all duration-200 ${
                  originalResume.isActive
                    ? "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-slate-800">{originalResume.jobType}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        Original Resume
                      </span>
                    </div>
                    {originalResume.title && <p className="text-slate-700 mt-1">{originalResume.title}</p>}
                    <p className="text-sm text-slate-700 mt-1">
                      Created: {new Date(originalResume.createdAt).toLocaleDateString()}
                    </p>
                    {originalResume.isActive && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                        Active Resume
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingResumeId(originalResume.id)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-semibold"
                    >
                      View/Edit
                    </button>
                    {!originalResume.isActive && (
                      <button
                        onClick={() => handleSetActive(originalResume.id)}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-semibold"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customized Resumes */}
          <div className="bg-white rounded-xl shadow-soft border border-slate-200/50 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Customized Resumes</h2>
            {loading ? (
              <p className="text-slate-700">Loading resumes...</p>
            ) : customizedResumes.length === 0 ? (
              <p className="text-slate-700">No customized resumes yet. Create one for a specific job application!</p>
            ) : (
              <div className="space-y-4">
                {customizedResumes.map((resume) => (
                  <div
                    key={resume.id}
                    className={`border rounded-xl p-5 transition-all duration-200 ${
                      resume.isActive
                        ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg text-slate-800">{resume.jobType}</h3>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                            Customized
                          </span>
                        </div>
                        {resume.companyName && (
                          <p className="text-slate-700 mt-1">at {resume.companyName}</p>
                        )}
                        {resume.title && <p className="text-slate-700 text-sm mt-1">{resume.title}</p>}
                        <p className="text-sm text-slate-700 mt-1">
                          Created: {new Date(resume.createdAt).toLocaleDateString()}
                        </p>
                        {resume.isActive && (
                          <span className="inline-block mt-2 px-2 py-1 bg-purple-600 text-white text-xs rounded">
                            Active Resume
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewingResumeId(resume.id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-semibold"
                        >
                          View/Edit
                        </button>
                        {!resume.isActive && (
                          <button
                            onClick={() => handleSetActive(resume.id)}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-semibold"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(resume.id)}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 text-sm font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {viewingResumeId && (
        <ResumeViewer
          resumeId={viewingResumeId}
          onClose={() => setViewingResumeId(null)}
          onUpdate={() => {
            loadResumes();
            setViewingResumeId(null);
          }}
        />
      )}
    </div>
  );
}



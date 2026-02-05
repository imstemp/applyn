import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";

const profileSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
  workHistory: z.array(
    z.object({
      company: z.string().min(1),
      position: z.string().min(1),
      startDate: z.string(),
      endDate: z.string().optional(),
      description: z.string().optional(),
    })
  ),
  skills: z.array(z.string()),
  education: z.array(
    z.object({
      institution: z.string().min(1),
      degree: z.string().min(1),
      field: z.string().optional(),
      graduationDate: z.string().optional(),
    })
  ),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [hasOriginalResume, setHasOriginalResume] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      personalInfo: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        location: "",
      },
      workHistory: [],
      skills: [],
      education: [],
    },
  });

  const workHistory = watch("workHistory");
  const skills = watch("skills");
  const education = watch("education");

  useEffect(() => {
    // Load existing profile
    api.profile.get()
      .then((response) => {
        if (response.success && response.data) {
          setValue("personalInfo", response.data.personalInfo || {});
          setValue("workHistory", response.data.workHistory || []);
          // Handle skills as JSON array (SQLite stores as JSON)
          const skillsArray = Array.isArray(response.data.skills) ? response.data.skills : [];
          setValue("skills", skillsArray);
          setValue("education", response.data.education || []);
        }
      })
      .catch(console.error);
    
    // Check if user has an original resume
    api.resume.list()
      .then((response) => {
        if (response.success && response.data) {
          const originalResume = response.data.find((r: any) => r.isTrueResume);
          setHasOriginalResume(!!originalResume);
        }
      })
      .catch(console.error);
  }, [setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    setSaved(false);

    try {
      const response = await api.profile.update(data);

      if (response.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 5000);
        // Check if original resume exists after saving
        api.resume.list()
          .then((response) => {
            if (response.success && response.data) {
              const originalResume = response.data.find((r: any) => r.isTrueResume);
              setHasOriginalResume(!!originalResume);
            }
          })
          .catch(console.error);
      } else {
        alert(response.error || "Failed to save profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("An error occurred while saving profile");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateOriginalResume = async () => {
    if (!confirm("This will regenerate your original resume with your updated profile information. The existing original resume will be replaced. Continue?")) {
      return;
    }

    setRegenerating(true);
    try {
      // Generate new original resume (General type, ageOptimized false)
      const response = await api.resume.generate({ jobType: "General", ageOptimized: false });

      if (response.success) {
        setHasOriginalResume(true);
        alert("Original resume regenerated successfully with your updated profile!");
        // Refresh the page to show updated resume
        window.location.reload();
      } else {
        alert(response.error || "Failed to regenerate resume");
      }
    } catch (error) {
      console.error("Error regenerating resume:", error);
      alert("An error occurred while regenerating resume");
    } finally {
      setRegenerating(false);
    }
  };

  const addWorkHistory = () => {
    const current = workHistory || [];
    setValue("workHistory", [
      ...current,
      { company: "", position: "", startDate: "", endDate: "", description: "" },
    ]);
  };

  const removeWorkHistory = (index: number) => {
    const current = workHistory || [];
    setValue("workHistory", current.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    const skill = newSkill.trim();
    if (skill) {
      setValue("skills", [...(skills || []), skill]);
      setNewSkill("");
    }
  };

  const handleSkillKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const removeSkill = (index: number) => {
    const current = skills || [];
    setValue("skills", current.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    const current = education || [];
    setValue("education", [
      ...current,
      { institution: "", degree: "", field: "", graduationDate: "" },
    ]);
  };

  const removeEducation = (index: number) => {
    const current = education || [];
    setValue("education", current.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-soft border border-slate-200/50 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          Personal Information
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              First Name
            </label>
            <input
              {...register("personalInfo.firstName")}
              className="block w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
            />
            {errors.personalInfo?.firstName && (
              <p className="text-red-500 text-sm mt-1">
                {errors.personalInfo.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Last Name
            </label>
            <input
              {...register("personalInfo.lastName")}
              className="block w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
            />
            {errors.personalInfo?.lastName && (
              <p className="text-red-500 text-sm mt-1">
                {errors.personalInfo.lastName.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              {...register("personalInfo.email")}
              className="block w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Phone
            </label>
            <input
              {...register("personalInfo.phone")}
              className="block w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Location
            </label>
            <input
              {...register("personalInfo.location")}
              className="block w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-soft border border-slate-200/50 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            Work History
          </h2>
            <button
              type="button"
              onClick={addWorkHistory}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm"
            >
              + Add Experience
            </button>
        </div>
        {workHistory?.map((work, index) => (
          <div key={index} className="border border-slate-200 rounded-xl p-5 mb-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="grid grid-cols-2 gap-4 mb-2">
              <input
                {...register(`workHistory.${index}.company`)}
                placeholder="Company"
                className="border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
              <input
                {...register(`workHistory.${index}.position`)}
                placeholder="Position"
                className="border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
              <input
                {...register(`workHistory.${index}.startDate`)}
                placeholder="MM/YYYY"
                className="border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
              <input
                {...register(`workHistory.${index}.endDate`)}
                placeholder="MM/YYYY or leave blank if current"
                className="border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <button
                  type="button"
                  onClick={() => {
                    const currentValue = watch(`workHistory.${index}.description`) || "";
                    const lines = currentValue.split('\n');
                    const bulletedLines = lines.map(line => 
                      line.trim() && !line.startsWith('•') && !line.startsWith('-') 
                        ? `• ${line.trim()}` 
                        : line
                    );
                    setValue(`workHistory.${index}.description`, bulletedLines.join('\n'));
                  }}
                  className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors duration-200"
                  title="Add bullet points to all lines"
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10m-7 4h7" />
                  </svg>
                  Add Bullets
                </button>
              </div>
              <textarea
                {...register(`workHistory.${index}.description`)}
                placeholder="Enter description... Press Enter for new line. Use 'Add Bullets' button to format."
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 font-sans"
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const textarea = e.currentTarget;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const value = textarea.value;
                    const beforeCursor = value.substring(0, start);
                    const afterCursor = value.substring(end);
                    const lines = beforeCursor.split('\n');
                    const currentLine = lines[lines.length - 1];
                    
                    // Check if current line starts with bullet point
                    const isBulletLine = currentLine.trim().startsWith('•') || currentLine.trim().startsWith('-');
                    const newLinePrefix = isBulletLine ? '• ' : '';
                    
                    const newValue = beforeCursor + '\n' + newLinePrefix + afterCursor;
                    setValue(`workHistory.${index}.description`, newValue);
                    
                    // Set cursor position after the new line prefix
                    setTimeout(() => {
                      textarea.selectionStart = textarea.selectionEnd = start + 1 + newLinePrefix.length;
                    }, 0);
                  }
                }}
              />
              <p className="text-xs text-slate-700 mt-1">
                Tip: Press Enter to create a new line. If the previous line has a bullet, the new line will automatically get one too.
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeWorkHistory(index)}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-soft border border-slate-200/50 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            Skills
          </h2>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={handleSkillKeyPress}
            placeholder="Enter a skill and press Enter or click Add"
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200"
          />
          <button
            type="button"
            onClick={addSkill}
            disabled={!newSkill.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm"
          >
            + Add Skill
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills?.map((skill, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(index)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-soft border border-slate-200/50 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v9M12 14l-9-5M12 14l9-5M12 5v9" />
              </svg>
            </div>
            Education
          </h2>
          <button
            type="button"
            onClick={addEducation}
            className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm"
          >
            + Add Education
          </button>
        </div>
        {education?.map((edu, index) => (
          <div key={index} className="border border-slate-200 rounded-xl p-5 mb-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="grid grid-cols-2 gap-4">
              <input
                {...register(`education.${index}.institution`)}
                placeholder="Institution"
                className="border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
              <input
                {...register(`education.${index}.degree`)}
                placeholder="Degree"
                className="border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
              <input
                {...register(`education.${index}.field`)}
                placeholder="Field of Study"
                className="border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
              <input
                {...register(`education.${index}.graduationDate`)}
                placeholder="MM/YYYY"
                className="border border-slate-300 rounded-xl px-4 py-3 text-gray-900 bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
            </div>
            <button
              type="button"
              onClick={() => removeEducation(index)}
              className="mt-2 text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105 transition-all duration-200 font-semibold"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </div>

      {saved && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded-r-xl animate-slide-in shadow-sm">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex items-center justify-between">
              <span>Profile saved successfully!</span>
              {hasOriginalResume && (
                <button
                  type="button"
                  onClick={handleRegenerateOriginalResume}
                  disabled={regenerating}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold transition-all duration-200"
                >
                  {regenerating ? "Regenerating..." : "Regenerate Original Resume"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}


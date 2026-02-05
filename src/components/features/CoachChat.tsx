import { useState, useRef, useEffect } from "react";
import type { Coach } from "@/types/coach";
import type { CoachMessage } from "@/types/coach";
import { api } from "@/lib/api";

/** Format resume content for the coach so they can reference it when giving feedback. */
function formatResumeForCoach(content: any): string {
  if (!content) return "";
  const parts: string[] = [];
  if (content.personalInfo && (content.personalInfo.name || content.personalInfo.email)) {
    const pi = content.personalInfo;
    const contact = [pi.name, pi.email, pi.phone, pi.location].filter(Boolean).join(" | ");
    parts.push(`CONTACT / CANDIDATE:\n${contact}`);
  }
  if (content.summary) parts.push(`PROFESSIONAL SUMMARY:\n${content.summary}`);
  if (content.coreCompetencies && Array.isArray(content.coreCompetencies)) {
    parts.push("CORE COMPETENCIES:\n" + content.coreCompetencies.map((s: string) => `• ${s}`).join("\n"));
  }
  if (content.workExperience && Array.isArray(content.workExperience)) {
    const expBlocks = content.workExperience.map((exp: any) => {
      const bullets = Array.isArray(exp.bullets)
        ? exp.bullets.map((b: string) => `• ${b}`).join("\n")
        : typeof exp.description === "string"
          ? exp.description.split("\n").map((line: string) => `• ${line.trim()}`).filter(Boolean).join("\n")
          : "";
      return `${exp.title || "Role"} at ${exp.company || "Company"}${exp.dates ? ` (${exp.dates})` : ""}\n${bullets}`;
    });
    parts.push("PROFESSIONAL EXPERIENCE:\n" + expBlocks.join("\n\n"));
  }
  if (content.education && Array.isArray(content.education)) {
    parts.push(
      "EDUCATION:\n" +
        content.education
          .map(
            (edu: any) =>
              [edu.degree, edu.field, edu.institution, edu.dates].filter(Boolean).join(", ")
          )
          .join("\n")
    );
  }
  if (content.skills && Array.isArray(content.skills)) {
    parts.push("SKILLS:\n" + content.skills.join(", "));
  }
  return parts.join("\n\n");
}

interface CoachChatProps {
  coach: Coach;
  onBack: () => void;
}

function getUserNameFromContent(content: any): string | null {
  if (!content?.personalInfo) return null;
  const pi = content.personalInfo;
  if (pi.firstName && pi.lastName) return `${pi.firstName} ${pi.lastName}`.trim();
  if (pi.name) return String(pi.name).trim();
  return null;
}

/** First name only, for a casual greeting (e.g. "Hi Jordan"). */
function getFirstNameFromContent(content: any): string | null {
  if (!content?.personalInfo) return null;
  const pi = content.personalInfo;
  if (pi.firstName) return String(pi.firstName).trim();
  const full = pi.name ? String(pi.name).trim() : "";
  const first = full.split(/\s+/)[0];
  return first || null;
}

export default function CoachChat({ coach, onBack }: CoachChatProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumeContext, setResumeContext] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const greetingRequestedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api.resume
      .list()
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        const active = res.data.find((r: any) => r.isActive) ?? res.data[0];
        if (active) {
          api.resume
            .get(active.id)
            .then((getRes) => {
              if (cancelled || !getRes.success || !getRes.data?.content) return;
              const content = getRes.data.content;
              setResumeContext(formatResumeForCoach(content));
              setUserName(getUserNameFromContent(content));
              setFirstName(getFirstNameFromContent(content));
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // One-time greeting when chat opens, using the user's first name
  useEffect(() => {
    if (messages.length > 0 || greetingRequestedRef.current || loading) return;
    if (!resumeContext && !userName && !firstName) return;

    greetingRequestedRef.current = true;
    setLoading(true);

    const greetingPrompt =
      firstName
        ? `The user just opened the chat. Say a very brief, warm greeting (1–2 sentences) that uses their first name only ("${firstName}")—e.g. "Hi ${firstName}!" or "Hey ${firstName},". Invite them to share what they'd like help with. Do not list your capabilities—just greet them personally.`
        : userName
          ? `The user just opened the chat. Say a very brief, warm greeting (1–2 sentences) that uses their name ("${userName}"). Invite them to share what they'd like help with. Do not list your capabilities—just greet them personally.`
          : `The user just opened the chat. Say a very brief, warm greeting (1–2 sentences). Invite them to share what they'd like help with. Do not list your capabilities—just greet them.`;

    api.coach
      .chat({
        systemPrompt: coach.systemPrompt + "\n\n[Current instruction: " + greetingPrompt + "]",
        messages: [{ role: "user", content: "I just opened our chat." }],
      })
      .then((response) => {
        if (response.success && response.data?.content) {
          setMessages([{ role: "assistant", content: response.data.content }]);
        }
      })
      .catch(() => {
        greetingRequestedRef.current = false;
      })
      .finally(() => {
        setLoading(false);
      });
  }, [coach.systemPrompt, resumeContext, userName, firstName, messages.length, loading]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const systemPromptWithResume =
    coach.systemPrompt +
    (resumeContext
      ? `\n\n[The user's current resume (use this when giving feedback on their resume, bullets, or LinkedIn). You may use the candidate's name from CONTACT / CANDIDATE when they ask or when addressing them naturally.):\n${resumeContext}]`
      : "");

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: CoachMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.coach.chat({
        systemPrompt: systemPromptWithResume,
        messages: [...messages, userMessage],
      });
      if (response.success && response.data?.content) {
        setMessages((prev) => [...prev, { role: "assistant", content: response.data!.content }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response.error || "Sorry, I couldn't respond. Check your API key in Settings." },
        ]);
      }
    } catch (err) {
      console.error("Coach chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const initials = coach.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[420px]">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-slate-200 flex items-center gap-4 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/80 text-slate-600 hover:text-slate-900 transition-colors"
          aria-label="Back to coaches"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
          {coach.photoUrl ? (
            <img src={coach.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-800">{coach.name}</h2>
          <p className="text-sm text-slate-600">{coach.title}</p>
          {resumeContext && (
            <p className="text-xs text-slate-500 mt-1">Using your active resume for context</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="font-medium text-slate-700">Start the conversation</p>
            <p className="text-sm mt-1">Ask about your resume, LinkedIn, or application materials.</p>
            {resumeContext && (
              <p className="text-xs text-slate-400 mt-2">Your coach can see your active resume and give tailored feedback.</p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-600 rounded-2xl px-4 py-3">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 flex-shrink-0 bg-slate-50/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

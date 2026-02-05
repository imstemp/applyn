import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CoachChat from "@/components/features/CoachChat";
import { coaches } from "@/data/coaches";
import type { Coach } from "@/types/coach";

export default function CoachPage() {
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  if (selectedCoach) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <CoachChat coach={selectedCoach} onBack={() => setSelectedCoach(null)} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 rounded-2xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold mb-2">Career Coach</h1>
          <p className="text-white/90 text-lg">
            Chat with AI career coaches for resume, LinkedIn, and application advice.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coaches.map((coach) => {
            const initials = coach.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <div
                key={coach.id}
                className="bg-white rounded-2xl shadow-soft border border-slate-200/50 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {coach.photoUrl ? (
                        <img
                          src={coach.photoUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-slate-800">{coach.name}</h2>
                      <p className="text-sm text-cyan-600 font-medium">{coach.title}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-slate-600 text-sm line-clamp-4">
                    {coach.bio.replace(/\*\*[^*]+\*\*/g, "").replace(/[•\-]\s/g, "").slice(0, 200)}...
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedCoach(coach)}
                    className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg transition-all"
                  >
                    Chat with {coach.name.split(" ")[0]}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}

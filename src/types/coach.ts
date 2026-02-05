export interface Coach {
  id: string;
  name: string;
  title: string;
  specialization: string;
  photoUrl: string;
  bio: string;
  systemPrompt: string;
}

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

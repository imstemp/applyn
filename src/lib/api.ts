// API utility for Electron IPC calls

declare global {
  interface Window {
    electronAPI: {
      profile: {
        get: () => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      };
      resume: {
        list: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
        get: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        generate: (data: { jobType: string; ageOptimized?: boolean }) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (data: { id: string; data: any }) => Promise<{ success: boolean; data?: any; error?: string }>;
        delete: (id: string) => Promise<{ success: boolean; error?: string }>;
        setActive: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        downloadWord: (id: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      };
      coverLetter: {
        generate: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
        list: (resumeId?: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      };
      interviewPrep: {
        generate: (resumeId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        get: (resumeId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
        update: (data: { resumeId: string; notes: any }) => Promise<{ success: boolean; data?: any; error?: string }>;
      };
      skillsHighlight: {
        analyze: (data: { resumeId: string; jobDescription: string }) => Promise<{ success: boolean; data?: any; error?: string }>;
        list: (resumeId?: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      };
    };
  }
}

export const api = {
  profile: {
    get: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.profile.get();
    },
    update: async (data: any) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.profile.update(data);
    },
  },
  resume: {
    list: async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.resume.list();
    },
    get: async (id: string) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.resume.get(id);
    },
    generate: async (data: { jobType: string; ageOptimized?: boolean }) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.resume.generate(data);
    },
    generateTrue: async (data: { ageOptimized?: boolean }) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.resume.generateTrue(data);
    },
    customize: async (data: { jobTitle: string; companyName: string; jobDescription: string; ageOptimized?: boolean }) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.resume.customize(data);
    },
    update: async (data: { id: string; data: any }) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.resume.update(data);
    },
    delete: async (id: string) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.resume.delete(id);
    },
    setActive: async (id: string) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.resume.setActive(id);
    },
    downloadWord: async (id: string) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.resume.downloadWord(id);
    },
  },
  coverLetter: {
    generate: async (data: any) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.coverLetter.generate(data);
    },
    list: async (resumeId?: string) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.coverLetter.list(resumeId);
    },
  },
  interviewPrep: {
    generate: async (resumeId: string) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.interviewPrep.generate(resumeId);
    },
    get: async (resumeId: string) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.interviewPrep.get(resumeId);
    },
    update: async (data: { resumeId: string; notes: any }) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.interviewPrep.update(data);
    },
  },
  skillsHighlight: {
    analyze: async (data: { resumeId: string; jobDescription: string }) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.skillsHighlight.analyze(data);
    },
    list: async (resumeId?: string) => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      return window.electronAPI.skillsHighlight.list(resumeId);
    },
  },
};


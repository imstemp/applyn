import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Config methods
  getAnthropicKey: () => ipcRenderer.invoke('config:getAnthropicKey'),
  setAnthropicKey: (apiKey: string) => ipcRenderer.invoke('config:setAnthropicKey', apiKey),
  
  // Profile methods
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    update: (data: any) => ipcRenderer.invoke('profile:update', data),
  },
  
  // Resume methods
  resume: {
    list: () => ipcRenderer.invoke('resume:list'),
    get: (id: string) => ipcRenderer.invoke('resume:get', id),
    generate: (data: { jobType: string; ageOptimized?: boolean }) => ipcRenderer.invoke('resume:generate', data),
    generateTrue: (data: { ageOptimized?: boolean }) => ipcRenderer.invoke('resume:generateTrue', data),
    customize: (data: { jobTitle: string; companyName: string; jobDescription: string; ageOptimized?: boolean }) => ipcRenderer.invoke('resume:customize', data),
    update: (data: { id: string; data: any }) => ipcRenderer.invoke('resume:update', data),
    delete: (id: string) => ipcRenderer.invoke('resume:delete', id),
    setActive: (id: string) => ipcRenderer.invoke('resume:setActive', id),
    downloadWord: (id: string) => ipcRenderer.invoke('resume:downloadWord', id),
  },
  
  // Cover letter methods
  coverLetter: {
    generate: (data: any) => ipcRenderer.invoke('coverLetter:generate', data),
    list: (resumeId?: string) => ipcRenderer.invoke('coverLetter:list', resumeId),
  },
  
  // Interview prep methods
  interviewPrep: {
    generate: (resumeId: string) => ipcRenderer.invoke('interviewPrep:generate', resumeId),
    get: (resumeId: string) => ipcRenderer.invoke('interviewPrep:get', resumeId),
    update: (data: { resumeId: string; notes: any }) => ipcRenderer.invoke('interviewPrep:update', data),
  },
  
  // Skills highlight methods
  skillsHighlight: {
    analyze: (data: { resumeId: string; jobDescription: string }) => ipcRenderer.invoke('skillsHighlight:analyze', data),
    list: (resumeId?: string) => ipcRenderer.invoke('skillsHighlight:list', resumeId),
  },

  // Career coach methods
  coach: {
    chat: (data: { systemPrompt: string; messages: { role: 'user' | 'assistant'; content: string }[] }) =>
      ipcRenderer.invoke('coach:chat', data),
  },
});


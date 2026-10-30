import axios from 'axios';

// Dynamically read API URL from environment, or auto-detect public production domain
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]');

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof window === 'undefined') {
    return envUrl || 'http://localhost:3001/api';
  }

  // If running locally in browser
  if (isLocalhost) {
    return (envUrl || 'http://localhost:3001/api').replace(/\/+$/, '');
  }

  // Running on public cloud server (Render, Vercel, Railway, etc.)
  // If a remote production API URL was explicitly provided, use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }

  // Otherwise, use current public domain's /api endpoint
  return `${window.location.origin}/api`;
};

export const getSocketUrl = () => {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (typeof window === 'undefined') {
    return envSocket || 'http://localhost:3001';
  }

  if (isLocalhost) {
    return (envSocket || 'http://localhost:3001').replace(/\/+$/, '');
  }

  if (envSocket && !envSocket.includes('localhost') && !envSocket.includes('127.0.0.1')) {
    return envSocket.replace(/\/+$/, '');
  }

  return window.location.origin;
};

const API_BASE_URL = getApiBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('studysquad_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors gracefully & trigger Pro upgrade when paywall hits
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 403 &&
      (error.response?.data?.error === 'DAILY_AI_LIMIT_REACHED' ||
        error.response?.data?.upgradeRequired)
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('studysquad:open-pro-modal', {
            detail: error.response.data,
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
export const authAPI = {
  register: (name, email, password) =>
    client.post('/auth/register', { name, email, password }),
  login: (email, password) =>
    client.post('/auth/login', { email, password }),
  googleLogin: (googleData) =>
    client.post('/auth/google', googleData),
  getMe: () => client.get('/auth/me'),
  updateMe: (data) => client.patch('/auth/me', data),
  incrementPomodoro: () => client.post('/auth/me/pomodoro'),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) =>
    client.post('/auth/reset-password', { token, newPassword }),
  getPublicProfile: (userId) => client.get(`/auth/user/${userId}`),
};

// Squad Endpoints
export const squadsAPI = {
  getAll: (params) => client.get('/squads', { params }),
  getLivePresence: () => client.get('/squads/live-presence'),
  getById: (id) => client.get(`/squads/${id}`),
  create: (squadData) => client.post('/squads', squadData),
  update: (id, squadData) => client.patch(`/squads/${id}`, squadData),
  delete: (id) => client.delete(`/squads/${id}`),
  join: (id) => client.post(`/squads/${id}/join`),
  leave: (id) => client.post(`/squads/${id}/leave`),
  getTasks: (id) => client.get(`/squads/${id}/tasks`),
  addTask: (id, text) => client.post(`/squads/${id}/tasks`, { text }),
  updateTask: (squadId, taskId, data) =>
    client.patch(`/squads/${squadId}/tasks/${taskId}`, data),
  deleteTask: (squadId, taskId) =>
    client.delete(`/squads/${squadId}/tasks/${taskId}`),
  getResources: (id) => client.get(`/squads/${id}/resources`),
  addResource: (id, resourceData) => client.post(`/squads/${id}/resources`, resourceData),
  deleteResource: (id, resourceId) => client.delete(`/squads/${id}/resources/${resourceId}`),
  updateNotes: (id, notes) => client.patch(`/squads/${id}/notes`, { notes }),
  getMessages: (id, limit = 100) => client.get(`/squads/${id}/messages`, { params: { limit } }),
  sendMessage: (id, content) => client.post(`/squads/${id}/messages`, { content }),
  uploadResource: (id, formData, onUploadProgress) =>
    client.post(`/squads/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  // Admin controls
  getMembers: (id) => client.get(`/squads/${id}/members`),
  kickMember: (id, userId) => client.delete(`/squads/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) =>
    client.patch(`/squads/${id}/members/${userId}/role`, { role }),
  setAnnouncement: (id, pinnedMessage) =>
    client.patch(`/squads/${id}/announcement`, { pinnedMessage }),
};

// AI Endpoints
export const aiAPI = {
  getUsage: () => client.get('/ai/usage'),
  matchSquads: (categories, query) =>
    client.post('/ai/match', { categories, query }),
  suggestGoals: (squadName, subject, category) =>
    client.post('/ai/suggest-goals', { squadName, subject, category }),
  generateFlashcards: (params) =>
    client.post('/ai/generate-flashcards', params),
  generateQuiz: (params) =>
    client.post('/ai/generate-quiz', params),
  askSquadBot: (params) =>
    client.post('/ai/squad-bot', params),
  chatWithDoc: (params) =>
    client.post('/ai/chat-doc', params),
  vivaSimulator: (params) =>
    client.post('/ai/viva-simulator', params),
  generateCheatsheet: (params) =>
    client.post('/ai/generate-cheatsheet', params),
  feynmanExplain: (params) =>
    client.post('/ai/feynman-explain', params),
  codeAudit: (params) =>
    client.post('/ai/code-audit', params),
};

// Study Session Calendar & Exam Countdown Endpoints
export const eventsAPI = {
  getAll: (params) => client.get('/events', { params }),
  create: (data) => client.post('/events', data),
  update: (id, data) => client.put(`/events/${id}`, data),
  delete: (id) => client.delete(`/events/${id}`),
  exportIcsUrl: (id) => `${API_BASE_URL}/events/${id}/export-ics`,
  getAiStudyPlan: (params) => client.post('/events/ai-study-plan', params),
};

// Payment & Pro Subscription Endpoints
export const paymentAPI = {
  createOrder: (plan) => client.post('/payment/create-order', { plan }),
  verifyPayment: (data) => client.post('/payment/verify-payment', data),
  getStatus: () => client.get('/payment/status'),
  devActivatePro: () => client.post('/payment/dev-activate-pro'),
};

// Helper to resolve relative file/upload URLs to the active backend origin
export const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const backendRoot = (
    import.meta.env.VITE_API_URL ||
    (isLocalhost
      ? 'http://localhost:3001'
      : typeof window !== 'undefined'
      ? window.location.origin
      : '')
  ).replace(/\/api\/?$/, '');
  return `${backendRoot}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default client;

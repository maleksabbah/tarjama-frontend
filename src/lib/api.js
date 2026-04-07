const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  saveTokens(access, refresh) {
    this.token = access;
    this.refreshToken = refresh;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
    }
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }

  async request(method, path, body = null, isFile = false) {
    const headers = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (!isFile && body) headers['Content-Type'] = 'application/json';

    const config = { method, headers };
    if (body) config.body = isFile ? body : JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, config);

    if (res.status === 401) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request(method, path, body, isFile);
      this.clearTokens();
      throw new Error('SESSION_EXPIRED');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Request failed');
    }

    return res.json();
  }

  async tryRefresh() {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.saveTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  // Auth
  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.saveTokens(data.access_token, data.refresh_token);
    return data;
  }

  async register(email, password, username) {
    return this.request('POST', '/auth/register', { email, password, username });
  }

  me() { return this.request('GET', '/auth/me'); }
  quota() { return this.request('GET', '/auth/quota'); }

  // Upload
  presign() { return this.request('POST', '/upload/presign'); }

  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('POST', '/upload', formData, true);
  }

  // Jobs
  createJob(data) { return this.request('POST', '/jobs', data); }
  listJobs() { return this.request('GET', '/jobs'); }
  getJob(id) { return this.request('GET', `/jobs/${id}`); }
  getProgress(id) { return this.request('GET', `/jobs/${id}/progress`); }
  cancelJob(id) { return this.request('POST', `/jobs/${id}/cancel`); }

  // Files
  listFiles(jobId) { return this.request('GET', `/files/${jobId}`); }
  downloadFile(fileId) { return this.request('GET', `/files/download/${fileId}`); }
}

const api = new ApiClient();
export default api;

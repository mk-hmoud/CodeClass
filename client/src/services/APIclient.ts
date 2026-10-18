import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);

    // A logged-in student/instructor's session can be cut mid-use if an admin
    // enables maintenance mode. Redirect them to the maintenance page, but not
    // if the failing request IS a login attempt (Home/Login handle that error
    // inline) or if we're already there.
    const isMaintenance = error.response?.status === 503 && error.response?.data?.maintenance === true;
    const path = window.location.pathname;
    const isLoginAttempt = path === '/' || path === '/login';
    if (isMaintenance && !isLoginAttempt && path !== '/maintenance') {
      window.location.href = '/maintenance';
    }

    // A pending forced password change blocks every other endpoint server-side.
    // Surface it as an event so the gate opens even when the page was loaded
    // with a token minted before the flag was set.
    if (error.response?.status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      localStorage.setItem('mustChangePassword', '1');
      window.dispatchEvent(new Event('password-change-required'));
    }

    return Promise.reject(error);
  }
);

export default apiClient;

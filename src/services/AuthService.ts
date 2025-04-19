import apiClient from './APIclient';

interface LoginCredentials {
  email: string;
  password: string;
  role: "instructor" | "student";
}

interface SignupData {
  name: string;
  username: string;
  email: string;
  password: string;
  role: "instructor" | "student";
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    role: "instructor" | "student";
    name?: string;
  };
}

export const loginUser = async ({
  email,
  password,
  role,
}: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
      role,
    });

    const data = response.data;

    // Store token if present
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return {
      success: true,
      message: "Login successful",
      token: data.token,
      user: data.user,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

export const signupUser = async ({
  name,
  username,
  email,
  password,
  role,
}: SignupData): Promise<AuthResponse> => {
  try {
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const response = await apiClient.post('/auth/signup', {
      first_name: firstName,
      last_name: lastName,
      username,
      email,
      password,
      role,
    });

    const data = response.data;
    return {
      success: true,
      message: data.message || "Account successfully created",
    };
  } catch (error) {
    console.error("Signup error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

export const logout = (): void => {
  localStorage.removeItem("token");
};

export const getCurrentUser = (): { user: any; isAuthenticated: boolean } => {
  const token = localStorage.getItem("token");
  if (!token) {
    return { user: null, isAuthenticated: false };
  }
  
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return {
      user: decoded,
      isAuthenticated: true,
    };
  } catch (error) {
    console.error("Error parsing auth token:", error);
    return { user: null, isAuthenticated: false };
  }
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem("token") !== null;
};

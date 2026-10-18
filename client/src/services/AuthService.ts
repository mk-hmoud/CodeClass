import apiClient from './APIclient';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: "instructor" | "student";
}

export const MUST_CHANGE_PASSWORD_KEY = "mustChangePassword";
/** Fired when the API refuses a request because a password change is pending. */
export const PASSWORD_CHANGE_REQUIRED_EVENT = "password-change-required";

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    role: "instructor" | "student";
    name?: string;
    mustChangePassword?: boolean;
  };
}

export const loginUser = async ({
  email,
  password,
}: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    const data = response.data;

    if (data.token) {
      localStorage.setItem("token", data.token);
    }
    // The gate also re-opens on a 403 from the API, so this is a convenience
    // for the first render after login rather than the source of truth.
    if (data.user?.mustChangePassword) {
      localStorage.setItem(MUST_CHANGE_PASSWORD_KEY, "1");
    } else {
      localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    }

    return {
      success: true,
      message: "Login successful",
      token: data.token,
      user: data.user,
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Network error occurred",
    };
  }
};

export const signupUser = async ({
  name,
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

/**
 * Replaces the signed-in user's own password. On success the server returns a
 * token minted without the forced-change claim; swapping it in is what
 * actually lifts the API-level block, so the caller must not skip it.
 */
export const changeOwnPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.post("/auth/change-password", { currentPassword, newPassword });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    localStorage.removeItem(MUST_CHANGE_PASSWORD_KEY);
    return { success: true, message: response.data.message || "Password updated" };
  } catch (error) {
    const message = (error as { response?: { data?: { message?: string } } })
      ?.response?.data?.message;
    return { success: false, message: message || "Network error occurred" };
  }
};

import apiClient from './APIclient';

export interface UserSummary {
  user_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'instructor' | 'student';
  created_at: string;
}

export const fetchAllUsers = async (): Promise<UserSummary[]> => {
  try {
    const response = await apiClient.get('/admin/users');
    return response.data.users || [];
  } catch (error) {
    console.error("Fetch users error:", error);
    return [];
  }
};

export const deleteUser = async (userId: number): Promise<boolean> => {
  try {
    await apiClient.delete(`/admin/users/${userId}`);
    return true;
  } catch (error) {
    console.error("Delete user error:", error);
    return false;
  }
};

export const adminCreateUser = async (data: any): Promise<{ success: boolean; message: string }> => {
  try {
    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const response = await apiClient.post('/admin/users', {
      first_name: firstName,
      last_name: lastName,
      email: data.email,
      password: data.password,
      role: data.role,
    });

    return {
      success: true,
      message: response.data.message || "User successfully created",
    };
  } catch (error: any) {
    console.error("Admin create user error:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Network error occurred",
    };
  }
};

export const fetchAllClassroomsAdmin = async () => {
  try {
    const response = await apiClient.get('/admin/classrooms');
    return response.data.classrooms || [];
  } catch (error) {
    console.error("Fetch classrooms error:", error);
    return [];
  }
};

export const deleteClassroomAdmin = async (id: number): Promise<boolean> => {
  try {
    await apiClient.delete(`/admin/classrooms/${id}`);
    return true;
  } catch (error) {
    console.error("Delete classroom error:", error);
    return false;
  }
};

export const fetchPlatformAnalytics = async () => {
  try {
    const response = await apiClient.get('/admin/analytics');
    return response.data.analytics;
  } catch (error) {
    console.error("Fetch analytics error:", error);
    return null;
  }
};

export const adminChangeUserPassword = async (userId: number, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.put(`/admin/users/${userId}/password`, { newPassword });
    return {
      success: true,
      message: response.data.message || "Password successfully changed",
    };
  } catch (error: any) {
    console.error("Change password error:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Network error occurred",
    };
  }
};

export const adminBulkCreateUsers = async (students: any[]): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.post('/admin/users/bulk', { students });
    return {
      success: true,
      message: response.data.message || "Bulk import successful",
    };
  } catch (error: any) {
    console.error("Admin bulk create users error:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Network error occurred during bulk import",
    };
  }
};

import { apiClient, setAuthToken } from './client';
import { LoginRequest, LoginResponse, TeacherRead } from '@/types/api';
import { useAuthStore } from '@/store/authStore';

export const authApi = {
  // Login
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    const loginData = response.data;
    
    // Set token
    setAuthToken(loginData.access_token);
    
    // Update store
    useAuthStore.getState().setTeacher(loginData.teacher);
    
    return loginData;
  },
  
  // Get current user
  async getCurrentUser(): Promise<TeacherRead> {
    const response = await apiClient.get<TeacherRead>('/auth/me');
    const teacher = response.data;
    
    // Update store
    useAuthStore.getState().setTeacher(teacher);
    
    return teacher;
  },
  
  // Verify token
  async verifyToken(): Promise<boolean> {
    try {
      const response = await apiClient.post('/auth/verify');
      return response.data.valid;
    } catch {
      return false;
    }
  },
  
  // Logout
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Always logout locally
      useAuthStore.getState().logout();
    }
  },
  
  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.put('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
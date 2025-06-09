import { apiClient } from './client';
import { ClassRead, ClassCreate, StudentRead } from '@/types/api';

export const classesApi = {
  async getMyClasses(skip = 0, limit = 100): Promise<ClassRead[]> {
    const response = await apiClient.get<ClassRead[]>('/classes', {
      params: { skip, limit }
    });
    return response.data;
  },

  async getClass(classId: number): Promise<ClassRead> {
    const response = await apiClient.get<ClassRead>(`/classes/${classId}`);
    return response.data;
  },

  async createClass(data: ClassCreate): Promise<ClassRead> {
    const response = await apiClient.post<ClassRead>('/classes', data);
    return response.data;
  },

  async updateClass(classId: number, data: ClassCreate): Promise<ClassRead> {
    const response = await apiClient.put<ClassRead>(`/classes/${classId}`, data);
    return response.data;
  },

  async deleteClass(classId: number): Promise<void> {
    await apiClient.delete(`/classes/${classId}`);
  },

  async getClassStudents(
    classId: number, 
    skip = 0, 
    limit = 100,
    search?: string
  ): Promise<StudentRead[]> {
    const response = await apiClient.get<StudentRead[]>(
      `/classes/${classId}/students`,
      {
        params: { skip, limit, search }
      }
    );
    return response.data;
  },
};
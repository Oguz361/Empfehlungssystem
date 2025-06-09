import { apiClient } from './client';
import { StudentRead, StudentCreate } from '@/types/api';

export const studentsApi = {
  // Get single student
  async getStudent(studentId: number): Promise<StudentRead> {
    const response = await apiClient.get<StudentRead>(`/students/${studentId}`);
    return response.data;
  },

  // Update student
  async updateStudent(studentId: number, data: StudentCreate): Promise<StudentRead> {
    const response = await apiClient.put<StudentRead>(`/students/${studentId}`, data);
    return response.data;
  },

  // Delete student
  async deleteStudent(studentId: number): Promise<void> {
    await apiClient.delete(`/students/${studentId}`);
  },

  // Get student interactions
  async getStudentInteractions(
    studentId: number,
    limit?: number,
    skillId?: number
  ) {
    const response = await apiClient.get(`/students/${studentId}/interactions`, {
      params: { limit, skill_id: skillId }
    });
    return response.data;
  },

  // Get student statistics
  async getStudentStatistics(studentId: number) {
    const response = await apiClient.get(`/students/${studentId}/statistics`);
    return response.data;
  },
};
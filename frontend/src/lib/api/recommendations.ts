import { apiClient } from './client';

export interface SkillMastery {
  skill_id: number;
  skill_name: string;
  mastery: number;
  attempt_count: number;
  correct_count: number;
  last_attempt: string | null;
}

export interface ProblemRecommendation {
  problem_id: number;
  original_problem_id: string;
  description: string;
  skill_id: number;
  skill_name: string;
  predicted_probability: number;
  difficulty_category: string;
  recommendation_reason: string;
}

export interface PerformancePrediction {
  problem_id: number;
  skill_id: number;
  predicted_probability: number;
  confidence: number;
}

export const recommendationsApi = {
  // Get skill mastery profile
  async getStudentMasteryProfile(studentId: number): Promise<{
    student_id: number;
    skill_mastery: SkillMastery[];
    overall_mastery: number;
    last_update: string;
  }> {
    const response = await apiClient.get(
      `/recommendations/students/${studentId}/mastery-profile`
    );
    return response.data;
  },

  // Get recommended problems
  async getRecommendedProblems(
    studentId: number,
    difficulty?: 'easy' | 'optimal' | 'challenge',
    topK: number = 5,
    excludeRecentDays?: number
  ): Promise<{
    student_id: number;
    recommendations: ProblemRecommendation[];
    recommendation_strategy: string;
    generated_at: string;
  }> {
    const response = await apiClient.get(
      `/recommendations/students/${studentId}/recommended-problems`,
      {
        params: {
          difficulty,
          top_k: topK,
          exclude_recent_days: excludeRecentDays
        }
      }
    );
    return response.data;
  },

  // Predict performance on specific problems
  async predictPerformance(
    studentId: number,
    problemIds: number[]
  ): Promise<{
    student_id: number;
    predictions: PerformancePrediction[];
  }> {
    const response = await apiClient.post(
      `/recommendations/students/${studentId}/predict-performance`,
      { problem_ids: problemIds }
    );
    return response.data;
  }
};
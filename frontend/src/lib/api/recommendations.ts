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
  async getStudentMasteryProfile(studentId: number, minInteractions: number = 1): Promise<{
    student_db_id: number;
    student_first_name: string;
    student_last_name: string;
    profile_data: Array<{
      concept_db_id: number;
      internal_concept_idx: number;
      original_skill_id: string;
      concept_name: string;
      mastery_score: number;
      confidence: string;
      probes_evaluated: number;
    }>;
  }> {
    const response = await apiClient.get(
      `/recommendations/students/${studentId}/mastery-profile`,
      {
        params: { min_interactions: minInteractions }
      }
    );
    return response.data;
  },

  // Get recommended problems
  async getRecommendedProblems(
    studentId: number,
    difficulty: 'easy' | 'optimal' | 'challenge' = 'optimal',
    nRecommendations: number = 5,
    skillId?: number
  ): Promise<{
    student_id: number;
    target_difficulty: string;
    target_success_range: string;
    n_recommendations: number;
    recommendations: Array<{
      problem_id: number;
      original_problem_id: string;
      description: string;
      skill: {
        id: number;
        name: string;
      };
      predicted_success: number;
      fitness_score: number;
      difficulty_category: string;
    }>;
  }> {
    const response = await apiClient.get(
      `/recommendations/students/${studentId}/recommended-problems`,
      {
        params: {
          target_difficulty: difficulty,
          n_recommendations: nRecommendations,
          skill_id: skillId
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
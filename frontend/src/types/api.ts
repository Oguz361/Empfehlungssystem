// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  teacher: TeacherRead;
}

export interface TokenVerifyResponse {
  valid: boolean;
  teacher?: TeacherRead;
}

// Teacher Types
export interface TeacherRead {
  id: number;
  username: string;
  created_at: string;
}

// Class Types
export interface ClassRead {
  id: number;
  name: string;
  description: string;
  teacher_id: number;
  created_at: string;
}

export interface ClassCreate {
  name: string;
  description: string;
}

export interface ClassDashboardRead {
  id: number;
  name: string;
  student_count: number;
}

// Student Types
export interface StudentRead {
  id: number;
  first_name: string;
  last_name: string;
  class_id: number;
  last_interaction_update_timestamp?: string;
  created_at: string;
}

export interface StudentCreate {
  first_name: string;
  last_name: string;
}

// Skill Types
export interface SkillRead {
  id: number;
  name: string;
  original_skill_id: string;
  internal_idx: number;
}

// Problem Types
export interface ProblemRead {
  id: number;
  original_problem_id: string;
  internal_idx: number;
  description_placeholder?: string;
  difficulty_mu_q?: number;
  skill_id: number;
}

// Interaction Types
export interface InteractionRead {
  id: number;
  student_id: number;
  problem: {
    id: number;
    original_id: string;
    description: string;
  };
  skill: {
    id: number;
    name: string;
  };
  is_correct: boolean;
  timestamp: string;
}

// Recommendation Types
export interface ConceptMasteryData {
  concept_db_id: number;
  internal_concept_idx: number;
  original_skill_id: string;
  concept_name: string;
  mastery_score?: number;
  confidence: string;
  probes_evaluated: number;
}

export interface MasteryProfileResponse {
  student_db_id: number;
  student_first_name: string;
  student_last_name: string;
  profile_data: ConceptMasteryData[];
}

export interface DifficultyPrognosisData {
  difficulty_category: string;
  predicted_success_rate?: number;
  num_probes_in_category: number;
}

export interface ConceptPrognosisResponse {
  student_db_id: number;
  student_first_name: string;
  student_last_name: string;
  concept_db_id: number;
  internal_concept_idx: number;
  original_skill_id: string;
  concept_name: string;
  prognosis_by_difficulty: DifficultyPrognosisData[];
}

export interface RecommendationItem {
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
}

export interface RecommendationsResponse {
  student_id: number;
  target_difficulty: string;
  target_success_range: string;
  n_recommendations: number;
  recommendations: RecommendationItem[];
}

// Import Types
export interface ImportResult {
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
  warnings: string[];
  processing_time_seconds: number;
}
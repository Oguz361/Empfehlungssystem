import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TeacherRead } from '@/types/api';
import { removeAuthToken } from '@/lib/api/client';

interface AuthState {
  teacher: TeacherRead | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setTeacher: (teacher: TeacherRead | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      teacher: null,
      isAuthenticated: false,
      isLoading: true,
      
      setTeacher: (teacher) => 
        set({ 
          teacher, 
          isAuthenticated: !!teacher,
          isLoading: false 
        }),
      
      logout: () => {
        removeAuthToken();
        set({ 
          teacher: null, 
          isAuthenticated: false,
          isLoading: false 
        });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        teacher: state.teacher,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
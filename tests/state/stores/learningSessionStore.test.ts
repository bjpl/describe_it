import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLearningSessionStore } from '@/lib/store/learningSessionStore';

// Mock Supabase service
vi.mock('@/lib/api/supabase', () => ({
  supabaseService: {
    createSession: vi.fn().mockResolvedValue({ id: 'mock-session-id' }),
    updateSession: vi.fn().mockResolvedValue({}),
    getUserSessions: vi.fn().mockResolvedValue([]),
  },
}));

describe('LearningSessionStore', () => {
  beforeEach(() => {
    useLearningSessionStore.setState({
      currentSession: null,
      sessionStartTime: null,
      isSessionActive: false,
      currentStats: {
        images_viewed: 0,
        descriptions_completed: 0,
        questions_answered: 0,
        questions_correct: 0,
        phrases_selected: 0,
        points_earned: 0,
        time_spent_minutes: 0,
      },
      preferences: {
        theme: 'auto',
        language: 'en',
        defaultDescriptionStyle: 'conversacional',
        autoSaveDescriptions: true,
        maxHistoryItems: 50,
        exportFormat: 'json',
      },
      learningSettings: {
        daily_goal: 10,
        session_length_minutes: 20,
        difficulty_preference: 'beginner',
        auto_advance: true,
        show_hints: true,
        play_audio: false,
        dark_mode: false,
      },
      recentSessions: [],
      dailyProgress: {
        sessions_today: 0,
        points_today: 0,
        goal_progress: 0,
        streak_days: 0,
      },
      ui: {
        sidebar_open: false,
        active_tab: 'search',
        selected_phrases: [],
        current_image_id: null,
        fullscreen_mode: false,
      },
    });
  });

  describe('Session Management', () => {
    it('should start a new session', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        await result.current.startSession('practice', 'user-123');
      });

      expect(result.current.isSessionActive).toBe(true);
      expect(result.current.currentSession).not.toBeNull();
      expect(result.current.sessionStartTime).toBeDefined();
    });

    it('should create anonymous session', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        await result.current.startSession('practice');
      });

      expect(result.current.currentSession?.user_id).toBe('anonymous');
    });

    it('should end current session before starting new one', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        await result.current.startSession('practice', 'user-123');
        await result.current.startSession('quiz', 'user-123');
      });

      expect(result.current.isSessionActive).toBe(true);
      expect(result.current.currentSession?.session_type).toBe('quiz');
    });

    it('should end session', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        await result.current.startSession('practice', 'user-123');
        await result.current.endSession();
      });

      expect(result.current.isSessionActive).toBe(false);
      expect(result.current.currentSession?.status).toBe('completed');
    });

    it('should add to recent sessions on end', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        await result.current.startSession('practice', 'user-123');
        await result.current.endSession();
      });

      expect(result.current.recentSessions).toHaveLength(1);
    });

    it('should pause session', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        await result.current.startSession('practice', 'user-123');
        await result.current.pauseSession();
      });

      expect(result.current.currentSession?.status).toBe('abandoned');
    });

    it('should resume session', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        await result.current.startSession('practice', 'user-123');
        await result.current.pauseSession();
        await result.current.resumeSession();
      });

      expect(result.current.currentSession?.status).toBe('active');
      expect(result.current.isSessionActive).toBe(true);
    });
  });

  describe('Statistics Tracking', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useLearningSessionStore());
      await act(async () => {
        await result.current.startSession('practice', 'user-123');
      });
    });

    it('should update session stats', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.updateSessionStats({
          images_viewed: 5,
          descriptions_completed: 3,
        });
      });

      expect(result.current.currentStats.images_viewed).toBe(5);
      expect(result.current.currentStats.descriptions_completed).toBe(3);
    });

    it('should record image viewed activity', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.recordActivity({ type: 'image_viewed' });
      });

      expect(result.current.currentStats.images_viewed).toBe(1);
    });

    it('should record description completed with points', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.recordActivity({
          type: 'description_completed',
          points: 10,
        });
      });

      expect(result.current.currentStats.descriptions_completed).toBe(1);
      expect(result.current.currentStats.points_earned).toBe(10);
    });

    it('should record correct answer', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.recordActivity({
          type: 'question_answered',
          correct: true,
          points: 5,
        });
      });

      expect(result.current.currentStats.questions_answered).toBe(1);
      expect(result.current.currentStats.questions_correct).toBe(1);
      expect(result.current.currentStats.points_earned).toBe(5);
    });

    it('should add points directly', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.addPoints(25);
      });

      expect(result.current.currentStats.points_earned).toBe(25);
    });
  });

  describe('Preferences and Settings', () => {
    it('should update preferences', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.updatePreferences({ theme: 'dark' });
      });

      expect(result.current.preferences.theme).toBe('dark');
    });

    it('should update learning settings', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.updateLearningSettings({
          daily_goal: 20,
          show_hints: false,
        });
      });

      expect(result.current.learningSettings.daily_goal).toBe(20);
      expect(result.current.learningSettings.show_hints).toBe(false);
    });
  });

  describe('Daily Progress', () => {
    it('should update daily progress on session end', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        await result.current.startSession('practice', 'user-123');
        result.current.addPoints(5);
        await result.current.endSession();
      });

      expect(result.current.dailyProgress.sessions_today).toBe(1);
      expect(result.current.dailyProgress.points_today).toBe(5);
    });

    it('should calculate goal progress percentage', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        result.current.updateLearningSettings({ daily_goal: 10 });
        await result.current.startSession('practice', 'user-123');
        result.current.addPoints(5);
        await result.current.endSession();
      });

      expect(result.current.dailyProgress.goal_progress).toBe(50);
    });

    it('should cap goal progress at 100%', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        result.current.updateLearningSettings({ daily_goal: 10 });
        await result.current.startSession('practice', 'user-123');
        result.current.addPoints(20);
        await result.current.endSession();
      });

      expect(result.current.dailyProgress.goal_progress).toBe(100);
    });
  });

  describe('UI State', () => {
    it('should set current image', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.setCurrentImage('image-123');
      });

      expect(result.current.ui.current_image_id).toBe('image-123');
    });

    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.ui.sidebar_open).toBe(true);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.ui.sidebar_open).toBe(false);
    });

    it('should set active tab', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.setActiveTab('history');
      });

      expect(result.current.ui.active_tab).toBe('history');
    });

    it('should toggle phrase selection', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.togglePhraseSelection('phrase-1');
        result.current.togglePhraseSelection('phrase-2');
      });

      expect(result.current.ui.selected_phrases).toContain('phrase-1');
      expect(result.current.ui.selected_phrases).toContain('phrase-2');

      act(() => {
        result.current.togglePhraseSelection('phrase-1');
      });

      expect(result.current.ui.selected_phrases).not.toContain('phrase-1');
    });

    it('should clear selected phrases', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.togglePhraseSelection('phrase-1');
        result.current.togglePhraseSelection('phrase-2');
        result.current.clearSelectedPhrases();
      });

      expect(result.current.ui.selected_phrases).toHaveLength(0);
    });

    it('should set fullscreen mode', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.setFullscreenMode(true);
      });

      expect(result.current.ui.fullscreen_mode).toBe(true);
    });
  });

  describe('Session Persistence', () => {
    it('should export session data', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      const exportData = result.current.exportSessionData();

      expect(exportData).toBeTruthy();
      expect(typeof exportData).toBe('string');

      const parsed = JSON.parse(exportData);
      expect(parsed.version).toBe('1.0');
      expect(parsed.preferences).toBeDefined();
      expect(parsed.learningSettings).toBeDefined();
    });

    it('should import session data', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      const exportData = result.current.exportSessionData();

      act(() => {
        result.current.updatePreferences({ theme: 'light' });
        const success = result.current.importSessionData(exportData);
        expect(success).toBe(true);
      });
    });

    it('should reject invalid import data', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      const success = result.current.importSessionData('invalid json');

      expect(success).toBe(false);
    });
  });

  describe('Session Reset', () => {
    it('should reset current session', async () => {
      const { result } = renderHook(() => useLearningSessionStore());

      await act(async () => {
        await result.current.startSession('practice', 'user-123');
        result.current.addPoints(10);
        result.current.resetCurrentSession();
      });

      expect(result.current.currentSession).toBeNull();
      expect(result.current.isSessionActive).toBe(false);
      expect(result.current.currentStats.points_earned).toBe(0);
    });

    it('should clear all data', () => {
      const { result } = renderHook(() => useLearningSessionStore());

      act(() => {
        result.current.updatePreferences({ theme: 'dark' });
        result.current.updateLearningSettings({ daily_goal: 20 });
        result.current.clearAllData();
      });

      expect(result.current.preferences.theme).toBe('auto');
      expect(result.current.learningSettings.daily_goal).toBe(10);
      expect(result.current.dailyProgress.points_today).toBe(0);
    });
  });
});

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { apiClient } from '@/lib/api-client';

// Practice & Master is iOS-only. On Android this provider stays inert.
const IS_IOS = Platform.OS === 'ios';
const IOS_HEADERS = { 'X-Client-Platform': 'ios' } as const;

export type QuizQuestion = { id: string; prompt: string; options: string[] };
export type QuizSubmitResult = {
  correct: number;
  total: number;
  results: { questionId: string; selectedIndex: number | null; correctIndex: number; correct: boolean; explanation: string }[];
};
export type MasteryItem = { topic: string; percent: number };
export type RoadmapItem = { title: string; topic: string; topicPercent: number };

type PracticeContextValue = {
  isAvailable: boolean;
  hasPractice: (videoTitle: string) => boolean;
  mastery: MasteryItem[];
  roadmap: RoadmapItem[];
  refresh: () => Promise<void>;
  fetchQuiz: (videoTitle: string) => Promise<QuizQuestion[]>;
  submitQuiz: (videoTitle: string, answers: { questionId: string; selectedIndex: number }[]) => Promise<QuizSubmitResult>;
};

const PracticeContext = createContext<PracticeContextValue | null>(null);

export function PracticeProvider({ children }: { children: ReactNode }) {
  const [availableTitles, setAvailableTitles] = useState<Set<string>>(new Set());
  const [mastery, setMastery] = useState<MasteryItem[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);

  const refresh = async () => {
    if (!IS_IOS) return;
    try {
      const [avail, me] = await Promise.all([
        apiClient.get<{ titles: string[] }>('/api/public/practice/available', { headers: IOS_HEADERS }),
        apiClient.get<{ mastery: MasteryItem[]; roadmap: RoadmapItem[] }>('/api/public/practice/me', { headers: IOS_HEADERS }),
      ]);
      setAvailableTitles(new Set(avail.titles ?? []));
      setMastery(me.mastery ?? []);
      setRoadmap(me.roadmap ?? []);
    } catch {
      // Not signed in / feature off — keep inert.
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const fetchQuiz = async (videoTitle: string) => {
    if (!IS_IOS) return [];
    const data = await apiClient.get<{ questions: QuizQuestion[] }>(
      `/api/public/practice/${encodeURIComponent(videoTitle)}`,
      { headers: IOS_HEADERS },
    );
    return data.questions ?? [];
  };

  const submitQuiz = async (
    videoTitle: string,
    answers: { questionId: string; selectedIndex: number }[],
  ) => {
    const data = await apiClient.post<QuizSubmitResult>(
      `/api/public/practice/${encodeURIComponent(videoTitle)}/submit`,
      { answers },
      { headers: IOS_HEADERS },
    );
    void refresh();
    return data;
  };

  const value = useMemo<PracticeContextValue>(
    () => ({
      isAvailable: IS_IOS,
      hasPractice: (videoTitle: string) => IS_IOS && availableTitles.has(videoTitle),
      mastery,
      roadmap,
      refresh,
      fetchQuiz,
      submitQuiz,
    }),
    [availableTitles, mastery, roadmap],
  );

  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
}

export function usePractice() {
  const ctx = useContext(PracticeContext);
  if (!ctx) throw new Error('usePractice must be used within PracticeProvider');
  return ctx;
}

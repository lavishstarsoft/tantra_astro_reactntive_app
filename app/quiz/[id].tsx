import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackNavButton } from '@/components/navigation/back-nav-button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { usePractice, type QuizQuestion, type QuizSubmitResult } from '@/providers/practice-provider';

export default function QuizScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const videoTitle = decodeURIComponent(params.id ?? '');
  const { fetchQuiz, submitQuiz } = usePractice();

  const appBg = useThemeColor({}, 'appBg');
  const cardBg = useThemeColor({}, 'appSurface');
  const border = useThemeColor({}, 'appBorder');
  const textPrimary = useThemeColor({}, 'appTextPrimary');
  const textMuted = useThemeColor({}, 'appTextMuted');
  const accent = useThemeColor({}, 'appAccent');

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const q = await fetchQuiz(videoTitle);
        setQuestions(q);
      } catch {
        setError('Practice is not available for this lesson.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every((q) => answers[q.id] !== undefined),
    [questions, answers],
  );

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({ questionId: q.id, selectedIndex: answers[q.id] }));
      const res = await submitQuiz(videoTitle, payload);
      setResult(res);
    } catch {
      setError('Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resultById = useMemo(() => {
    const m: Record<string, QuizSubmitResult['results'][number]> = {};
    result?.results.forEach((r) => { m[r.questionId] = r; });
    return m;
  }, [result]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <BackNavButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>Practice</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={accent} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={{ color: textMuted }}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {result ? (
            <View style={[styles.scoreCard, { backgroundColor: cardBg, borderColor: border }]}>
              <MaterialIcons name="school" size={28} color={accent} />
              <Text style={[styles.scoreText, { color: textPrimary }]}>
                You scored {result.correct} / {result.total}
              </Text>
              <Text style={[styles.scoreHint, { color: textMuted }]}>Review the explanations below.</Text>
            </View>
          ) : (
            <Text style={[styles.lead, { color: textMuted }]}>{videoTitle}</Text>
          )}

          {questions.map((q, qi) => {
            const res = resultById[q.id];
            return (
              <View key={q.id} style={[styles.qCard, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={[styles.prompt, { color: textPrimary }]}>{qi + 1}. {q.prompt}</Text>
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi;
                  const isCorrect = res && oi === res.correctIndex;
                  const isWrongPick = res && selected && !res.correct;
                  return (
                    <Pressable
                      key={oi}
                      disabled={Boolean(result)}
                      onPress={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      style={[
                        styles.option,
                        { borderColor: border },
                        selected && !result ? { borderColor: accent, backgroundColor: accent + '22' } : null,
                        isCorrect ? { borderColor: '#2E7D32', backgroundColor: '#2E7D3222' } : null,
                        isWrongPick ? { borderColor: '#C62828', backgroundColor: '#C6282822' } : null,
                      ]}>
                      <MaterialIcons
                        name={
                          result
                            ? isCorrect ? 'check-circle' : isWrongPick ? 'cancel' : 'radio-button-unchecked'
                            : selected ? 'radio-button-checked' : 'radio-button-unchecked'
                        }
                        size={20}
                        color={isCorrect ? '#2E7D32' : isWrongPick ? '#C62828' : selected ? accent : textMuted}
                      />
                      <Text style={[styles.optionText, { color: textPrimary }]}>{opt}</Text>
                    </Pressable>
                  );
                })}
                {res ? (
                  <Text style={[styles.explanation, { color: textMuted }]}>{res.explanation}</Text>
                ) : null}
              </View>
            );
          })}

          {!result ? (
            <Pressable
              disabled={!allAnswered || submitting}
              onPress={onSubmit}
              style={[styles.submitBtn, { backgroundColor: allAnswered ? accent : border }]}>
              <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Submit Answers'}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={[styles.submitBtn, { backgroundColor: accent }]}>
              <Text style={styles.submitText}>Done</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4, marginBottom: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  lead: { fontSize: 14, marginBottom: 12 },
  scoreCard: { borderRadius: 18, borderWidth: 1, padding: 18, alignItems: 'center', gap: 6, marginBottom: 14 },
  scoreText: { fontSize: 20, fontWeight: '800' },
  scoreHint: { fontSize: 13 },
  qCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12, gap: 8 },
  prompt: { fontSize: 15, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12 },
  optionText: { flex: 1, fontSize: 14 },
  explanation: { fontSize: 13, lineHeight: 19, marginTop: 4, fontStyle: 'italic' },
  submitBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});

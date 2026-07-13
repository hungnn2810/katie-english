'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {
  getSession, GameSession, SpeakingResult, PhonicsItemResult,
  ReadingActivityResult, MatchingItemResult, FillInBlankItemResult, SentenceSegment, VocabItem,
} from '@/lib/admin-api';
import { Check, X, ChevronDown, ChevronRight, Hash, Mic, BookOpen, ImageIcon } from 'lucide-react';
import { PhonemeChips } from '@/app/student/session/[id]/_components/PhonemeChips';

function scoreHex(score: number) {
  if (score >= 80) return '#22C55E';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function scoreBg(score: number) {
  if (score >= 80) return '#F0FDF4';
  if (score >= 50) return '#FFFBEB';
  return '#FEF2F2';
}

function scoreLabel(score: number, t: (key: string) => string) {
  if (score >= 80) return t('scoreLabels.great');
  if (score >= 50) return t('scoreLabels.ok');
  return t('scoreLabels.needsWork');
}

// ── MatchingResultRow ─────────────────────────────────────────────────────────

function MatchingResultRow({ r }: { r: MatchingItemResult }) {
  const t = useTranslations('teacher.sessionDetail');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
      {r.pair?.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.pair.imageUrl} alt={r.pair.word}
          style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }} />
      )}
      <Box sx={{ flex: 1, fontSize: 14, color: 'text.primary' }}>
        <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>{t('chosePrefix')}</Box>
        <Box component="span" sx={{ fontWeight: 600 }}>&quot;{r.studentChosenWord}&quot;</Box>
      </Box>
      <Box sx={{
        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
        bgcolor: r.isCorrect ? 'rgba(209,250,229,1)' : 'rgba(254,202,202,1)',
        color: r.isCorrect ? '#059669' : '#EF4444',
      }}>
        {r.isCorrect ? <Check size={14} /> : <X size={14} />}
      </Box>
    </Box>
  );
}

// ── FillInBlankResultRow ──────────────────────────────────────────────────────

function FillInBlankResultRow({ r }: { r: FillInBlankItemResult }) {
  const t = useTranslations('teacher.sessionDetail');
  const sentence = r.blank ? t('blankLabel', { index: r.blank.blankIndex ?? '?' }) : '—';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, py: 1, fontSize: 14 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box component="span" sx={{ color: 'text.secondary', fontSize: 12, flexShrink: 0 }}>{sentence}</Box>
        <Box component="span" sx={{ fontWeight: 600, px: 0.75, py: 0.25, borderRadius: 2, fontSize: 12 }}
          style={{
            background: r.isCorrect ? '#ecfdf5' : '#fef2f2',
            color: r.isCorrect ? '#15803d' : '#b91c1c',
          }}>
          {r.studentChosenWord}
        </Box>
      </Box>
      <Box sx={{
        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
        bgcolor: r.isCorrect ? 'rgba(209,250,229,1)' : 'rgba(254,202,202,1)',
        color: r.isCorrect ? '#059669' : '#EF4444',
      }}>
        {r.isCorrect ? <Check size={14} /> : <X size={14} />}
      </Box>
    </Box>
  );
}

// ── ActivityResultCard ────────────────────────────────────────────────────────

function ActivityResultCard({ activityResult }: { activityResult: ReadingActivityResult }) {
  const t = useTranslations('teacher.sessionDetail');
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(activityResult.score);
  const isMatching = activityResult.activity?.type === 'MATCH';
  const label = isMatching ? t('matching') : t('fillInBlank');
  const color = scoreHex(pct);
  const bg = scoreBg(pct);

  const renderFillInBlankSegments = (segments: SentenceSegment[], results: FillInBlankItemResult[]) => {
    const fillByBlankIdx = new Map<number, FillInBlankItemResult>();
    for (const res of results) {
      if (res.blank?.blankIndex != null) fillByBlankIdx.set(res.blank.blankIndex, res);
    }
    return segments.map((seg, idx) => {
      if (!seg.blank) return <span key={idx}>{seg.text}</span>;
      const result = fillByBlankIdx.get(seg.blankIndex!);
      return (
        <Box key={idx} component="span"
          sx={{ fontWeight: 600, px: 0.75, py: 0.25, borderRadius: 2, mx: 0.25 }}
          style={{
            background: result?.isCorrect ? '#ecfdf5' : '#fef2f2',
            color: result?.isCorrect ? '#15803d' : '#b91c1c',
          }}>
          {result?.studentChosenWord ?? '___'}
        </Box>
      );
    });
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: 1 }}>
      <Box component="button" type="button" onClick={() => setExpanded((e) => !e)}
        sx={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.75, bgcolor: 'transparent', border: 'none', cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(247,249,252,0.6)' }, transition: 'background-color 0.15s',
        }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            style={{ background: bg }}>
            <BookOpen size={14} style={{ color }} />
          </Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{label}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="span" sx={{ fontWeight: 900, fontSize: 16, fontVariantNumeric: 'tabular-nums' }} style={{ color }}>{pct}%</Box>
          {expanded
            ? <ChevronDown size={16} style={{ color: '#6B7280' }} />
            : <ChevronRight size={16} style={{ color: '#6B7280' }} />}
        </Box>
      </Box>

      {expanded && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 2.5, py: 1.5 }}>
          {isMatching ? (
            <Box sx={{ '& > *:not(:first-of-type)': { borderTop: '1px solid rgba(226,232,240,0.5)' } }}>
              {(activityResult.matchingResults ?? []).map((r) => (
                <MatchingResultRow key={r.id} r={r} />
              ))}
            </Box>
          ) : (
            <Box sx={{ '& > *:not(:first-of-type)': { borderTop: '1px solid rgba(226,232,240,0.5)' } }}>
              {(() => {
                const segments = (activityResult.activity as { sentenceSegments?: SentenceSegment[] })?.sentenceSegments;
                const fillResults = activityResult.fillInBlankResults ?? [];
                if (segments && segments.length > 0) {
                  return (
                    <Typography component="p" sx={{ fontSize: 14, color: 'text.primary', lineHeight: 1.625, py: 0.75 }}>
                      {renderFillInBlankSegments(segments, fillResults)}
                    </Typography>
                  );
                }
                return fillResults.map((r) => <FillInBlankResultRow key={r.id} r={r} />);
              })()}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}

// ── VocabResultRow ────────────────────────────────────────────────────────────

function VocabResultRow({ r }: { r: PhonicsItemResult }) {
  const t = useTranslations('teacher.sessionDetail');
  const pct = r.score;
  const color = scoreHex(pct);
  const bg = scoreBg(pct);
  const label = pct >= 80 ? `${t('scoreLabels.great')} ${pct}%` : `${pct}%`;
  const word = r.vocabItem?.word ?? '';
  const imageUrl = r.vocabItem?.imageUrl;
  const hasFeedback = r.bfa?.success && (r.bfa?.feedback ?? []).length > 0;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, border: '1px solid #E2E8F0' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Left: image thumbnail */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={word}
            style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }}
          />
        )}
        {/* Center: word + phoneme chips + transcribed text */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary' }}>{word}</Typography>
          {hasFeedback && <PhonemeChips feedback={r.bfa!.feedback} />}
          {r.transcribedText && (
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, fontStyle: 'italic' }}>
              &quot;{r.transcribedText}&quot;
            </Typography>
          )}
        </Box>
        {/* Right: score badge */}
        <Box
          component="span"
          aria-label={`${pct} percent — ${scoreLabel(pct, t)}`}
          sx={{ flexShrink: 0, fontSize: 14, fontWeight: 700, px: 1.5, py: 0.5, borderRadius: '999px' }}
          style={{ background: bg, color }}
        >
          {label}
        </Box>
      </Box>
    </Paper>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeacherSessionDetailPage() {
  const t = useTranslations('teacher.sessionDetail');
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>();
  const hwId = Number(id);
  const sId = Number(sessionId);
  const [session, setSession] = useState<GameSession | null>(null);
  useEffect(() => { getSession(sId).then(setSession).catch(() => {}); }, [sId]);

  if (!session) return (
    <Box sx={{ color: 'text.secondary', py: 8, textAlign: 'center' }}>{t('loading')}</Box>
  );

  const homeworkType = session.assignment?.homework?.type;
  const isVocabulary = homeworkType === 'VOCABULARY';

  const speakingResults: SpeakingResult[] = session.speakingResults ?? [];
  const phonicsResults: PhonicsItemResult[] = session.phonicsResults ?? [];
  const readingActivityResults: ReadingActivityResult[] = session.readingActivityResults ?? [];

  // Vocab results live in phonicsResults when homework type is VOCABULARY.
  // Order them to match the vocabItems order when available.
  const vocabItems: VocabItem[] = session.vocabItems ?? [];
  const vocabResults: PhonicsItemResult[] = isVocabulary
    ? (vocabItems.length > 0
        ? vocabItems
            .map((vi) => phonicsResults.find((r) => r.vocabItemId === vi.id))
            .filter((r): r is PhonicsItemResult => r !== undefined)
        : phonicsResults.filter((r) => r.vocabItem != null))
    : [];

  const score = session.score != null ? Math.round(session.score) : null;
  const scoreColor = score != null ? scoreHex(score) : '#6B7280';
  const scoreBgColor = score != null ? scoreBg(score) : '#F8FAFC';
  const studentName = session.student?.fullname ?? `Student #${session.studentId}`;
  const initials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Box sx={{
      maxWidth: 672,
      animation: 'fadeIn 0.3s ease-in-out',
      '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
    }}>
      {/* Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14, mb: 3 }}>
        <Box component={Link} href="/teacher/homework"
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' }, transition: 'color 0.15s', textDecoration: 'none' }}>
          {t('breadcrumbHomework')}
        </Box>
        <Box component="span" sx={{ color: 'divider' }}>/</Box>
        <Box component={Link} href={`/teacher/homework/${hwId}`}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' }, transition: 'color 0.15s', textDecoration: 'none' }}>
          {t('breadcrumbDetail')}
        </Box>
        <Box component="span" sx={{ color: 'divider' }}>/</Box>
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>{studentName}</Box>
      </Box>

      {/* Score hero */}
      <Paper variant="outlined" sx={{ borderRadius: 4, p: 2.5, mb: 3, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 4, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 900, color: '#fff',
          }}
            style={{ background: 'linear-gradient(135deg, #4F9DFF, #A78BFA)' }}>
            {initials}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, color: 'text.primary', fontSize: 18 }}>{studentName}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 0.5 }}>
              {t('startedAt', { date: new Date(session.startedAt).toLocaleString() })}
              {session.completedAt && (
                <> {t('completedAtSuffix', { date: new Date(session.completedAt).toLocaleString() })}</>
              )}
            </Typography>
            {!session.completedAt && (
              <Box component="span" sx={{ display: 'inline-block', mt: 0.5, fontSize: 10, fontWeight: 700, px: 1, py: 0.25, borderRadius: '99px', bgcolor: '#FFFBEB', color: '#D97706' }}>
                {t('inProgress')}
              </Box>
            )}
          </Box>
          {score != null && (
            <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
              <Typography sx={{ fontSize: '2.25rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }} style={{ color: scoreColor }}>
                {score}%
              </Typography>
              <Box component="span" sx={{ fontSize: 12, fontWeight: 700, mt: 0.5, px: 1.25, py: 0.25, borderRadius: '99px', display: 'inline-block' }}
                style={{ background: scoreBgColor, color: scoreColor }}>
                {scoreLabel(score, t)}
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Phonics — hidden for VOCABULARY sessions (vocab rows live in phonicsResults but are rendered below) */}
      {phonicsResults.length > 0 && !isVocabulary && (
        <Box sx={{ mb: 3 }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ width: 24, height: 24, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              style={{ background: '#A78BFA18' }}>
              <Hash size={14} style={{ color: '#A78BFA' }} />
            </Box>
            {t('phonicsHeading')}
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>({phonicsResults.length})</Box>
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {phonicsResults.map((r, i) => {
              const pct = r.score;
              const color = scoreHex(pct);
              const bg = scoreBg(pct);
              return (
                <Paper key={r.id} variant="outlined" sx={{ borderRadius: 4, px: 2, py: 1.5, boxShadow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <Box component="span" sx={{ color: 'text.secondary', fontSize: 12, flexShrink: 0, width: 20, textAlign: 'right', opacity: 0.5 }}>{i + 1}.</Box>
                      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', flexShrink: 0 }}>{r.word?.text}</Box>
                      {r.transcribedText ? (
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          &quot;{r.transcribedText}&quot;
                        </Box>
                      ) : (
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: 14, fontStyle: 'italic', opacity: 0.5 }}>{t('noAnswer')}</Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      <Box sx={{ width: 96, height: 6, borderRadius: '99px', bgcolor: 'grey.100', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', borderRadius: '99px' }} style={{ width: `${pct}%`, background: color }} />
                      </Box>
                      <Box component="span" sx={{ fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums', width: 40, textAlign: 'right' }}
                        style={{ color, background: bg, padding: '2px 8px', borderRadius: 99 }}>
                        {pct}%
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Speaking */}
      {speakingResults.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ width: 24, height: 24, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              style={{ background: '#FF9BD218' }}>
              <Mic size={14} style={{ color: '#FF9BD2' }} />
            </Box>
            {t('speakingHeading')}
            {session.assignment?.homework?.speakingMode && (
              <Box component="span" sx={{ fontSize: 10, fontWeight: 700, px: 1, py: 0.25, borderRadius: '99px' }}
                style={{
                  background: session.assignment.homework.speakingMode === 'FREE_SPEAK' ? '#FF9BD218' : '#A78BFA18',
                  color: session.assignment.homework.speakingMode === 'FREE_SPEAK' ? '#FF9BD2' : '#A78BFA',
                }}>
                {session.assignment.homework.speakingMode === 'FREE_SPEAK' ? t('freeSpeak') : t('scriptMatch')}
              </Box>
            )}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {speakingResults.map((r) => {
              const pct = Math.round(r.score);
              const color = scoreHex(pct);
              const bg = scoreBg(pct);
              return (
                <Paper key={r.id} variant="outlined" sx={{ borderRadius: 4, px: 2.5, py: 2, boxShadow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {r.transcribedText ? (
                        <Typography sx={{ fontSize: 14, color: 'text.primary' }}>
                          {t('saidPrefix')}<Box component="span" sx={{ fontWeight: 500 }}>&quot;{r.transcribedText}&quot;</Box>
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: 14, color: 'text.secondary', fontStyle: 'italic', opacity: 0.6 }}>{t('noAnswerRecorded')}</Typography>
                      )}
                      <Typography sx={{ fontSize: 12, mt: 0.5, fontWeight: 500 }} style={{ color }}>
                        {t('wordsMatched', { matched: r.matchedWords, total: r.totalWords })}
                      </Typography>
                    </Box>
                    <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }} style={{ color }}>{pct}%</Typography>
                      <Box component="span" sx={{ fontSize: 10, fontWeight: 700, mt: 0.25, px: 0.75, py: 0.25, borderRadius: '99px', display: 'inline-block' }}
                        style={{ background: bg, color }}>
                        {r.matchedWords}/{r.totalWords}
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 1.5, height: 8, borderRadius: '99px', bgcolor: 'grey.100', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', borderRadius: '99px', transition: 'all 0.2s' }}
                      style={{ width: `${r.totalWords > 0 ? (r.matchedWords / r.totalWords) * 100 : 0}%`, background: color }} />
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Reading */}
      {readingActivityResults.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ width: 24, height: 24, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              style={{ background: '#6ED6C118' }}>
              <BookOpen size={14} style={{ color: '#6ED6C1' }} />
            </Box>
            {t('readingHeading')}
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>({readingActivityResults.length})</Box>
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {readingActivityResults.map((ar) => (
              <ActivityResultCard key={ar.id} activityResult={ar} />
            ))}
          </Box>
        </Box>
      )}

      {/* Vocabulary */}
      {isVocabulary && (
        <Box sx={{ mb: 3 }}>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ width: 24, height: 24, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              style={{ background: '#FFB26B18' }}>
              <ImageIcon size={14} style={{ color: '#FFB26B' }} />
            </Box>
            <Box component="span" style={{ color: '#FFB26B' }}>{t('vocabularyHeading')}</Box>
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>({vocabResults.length})</Box>
          </Typography>
          {vocabResults.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {vocabResults.map((r) => (
                <VocabResultRow key={r.id} r={r} />
              ))}
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ color: 'text.secondary', fontSize: 14, py: 4, textAlign: 'center', borderRadius: 2 }}>
              {t('noSubmissionsYet')}
            </Paper>
          )}
        </Box>
      )}

      {phonicsResults.length === 0 && speakingResults.length === 0 && readingActivityResults.length === 0 && !isVocabulary && (
        <Paper variant="outlined" sx={{ color: 'text.secondary', fontSize: 14, py: 5, textAlign: 'center', borderRadius: 4 }}>
          {t('noResultsYet')}
        </Paper>
      )}
    </Box>
  );
}

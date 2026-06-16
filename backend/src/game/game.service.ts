import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { GameRepository } from './game.repository';
import { StorageService } from '../storage/storage.service';
import { BfaService } from '../bfa/bfa.service';
import { BfaAnalyzeResult } from '../bfa/bfa.dto';
import { WordRepository } from '../word/word.repository';
import { StartSessionDto, SavePhonicsResultDto, SaveReadingResultDto, SaveVocabResultDto, SaveListenResultDto } from './game.dto';
import { calcSpeakingScore, calcFreeSpeak } from './game.scoring';

interface HwWithVocabItems {
  vocabItems: { id: number; word: string; phonemes: string | null }[];
}
interface HwWithListenItems {
  listenItems: { id: number; keywords: string; expectedText: string }[];
}
interface HwWithReadingActivities {
  readingActivities: { matchPairs: unknown[]; fillBlanks: unknown[] }[];
}
interface SessionWithListenResults {
  listenResults: { compositeScore: unknown }[];
}
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/jwt.service';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly repo: GameRepository,
    private readonly storage: StorageService,
    private readonly bfa: BfaService,
    private readonly wordRepository: WordRepository,
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async gameLogin(classCode: string, name: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { upn: name, role: 'STUDENT' },
      include: { student: { include: { class: true } } },
    });
    if (!user || !user.student) throw new UnauthorizedException('Student account not found');

    if (!user.student.class || user.student.class.code !== classCode) {
      throw new UnauthorizedException('Student not found in this class');
    }

    const validPw = await bcrypt.compare(password, user.password);
    if (!validPw) throw new UnauthorizedException('Invalid password');
    if (!user.approved) throw new ForbiddenException('Account pending approval');
    if (user.disabled) throw new ForbiddenException('Account disabled');

    const token = this.tokenService.sign({
      sub: user.id,
      upn: user.upn,
      role: 'STUDENT',
      studentId: user.student.id,
    });
    return { token, user: { id: user.id, upn: user.upn, role: user.role, studentId: user.student.id } };
  }

  async getAvailableAssignments(studentId: number) {
    const student = await this.repo.getAvailableAssignments(studentId);
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    return (student.class?.assignments ?? []).map((ac) => ac.assignment);
  }

  async startSession(dto: StartSessionDto) {
    return this.repo.createSession(dto.studentId, dto.assignmentId);
  }

  async getSession(id: number) {
    const session = await this.repo.getSession(id);
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  async saveSpeakingResult(sessionId: number, audioBuffer?: Buffer, mimeType?: string) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const hw = session.assignment.homework;
    if (hw.type !== 'SPEAKING') throw new BadRequestException('Homework is not a SPEAKING type');
    if (!hw.speakingText) throw new BadRequestException('Homework has no speaking text');

    const speakingMode = (hw as { speakingMode?: 'FREE_SPEAK' | 'SCRIPT_MATCH' }).speakingMode ?? 'SCRIPT_MATCH';
    const targetWords = hw.speakingText.trim().split(/\s+/).filter(Boolean);

    let transcribedText = '';
    let score = 0;
    let matchedWords = 0;
    let totalWords = targetWords.length;
    let phonemesJson: string | null = null;

    if (audioBuffer && audioBuffer.length > 0) {
      if (speakingMode === 'SCRIPT_MATCH') {
        try {
          const bfaResult = await this.bfa.analyzeSpeaking(
            audioBuffer,
            mimeType ?? 'audio/webm',
            hw.speakingText,
          );
          transcribedText = bfaResult.transcription?.text ?? '';
          score = bfaResult.overall_score;
          matchedWords = bfaResult.matched_words;
          totalWords = bfaResult.total_words;
          phonemesJson = JSON.stringify(bfaResult.words);
          this.logger.log(
            `[session=${sessionId}] BFA speaking: score=${score} matched=${matchedWords}/${totalWords} words=${bfaResult.words.length}`,
          );
        } catch (err) {
          this.logger.warn(`[session=${sessionId}] BFA analyzeSpeaking error: ${(err as Error).message} — falling back to transcribe`);
          try {
            const result = await this.bfa.transcribe(audioBuffer, mimeType ?? 'audio/webm');
            transcribedText = result.text;
            const scored = calcSpeakingScore(transcribedText, hw.speakingText);
            score = scored.score;
            matchedWords = scored.matchedWords;
            totalWords = scored.totalWords;
          } catch (transcribeErr) {
            this.logger.warn(`[session=${sessionId}] Fallback transcribe error: ${(transcribeErr as Error).message}`);
          }
        }
      } else {
        try {
          const result = await this.bfa.transcribe(audioBuffer, mimeType ?? 'audio/webm');
          transcribedText = result.text;
          this.logger.log(`[session=${sessionId}] FREE_SPEAK transcription: "${transcribedText}"`);
        } catch (err) {
          this.logger.warn(`[session=${sessionId}] WhisperX transcribe error: ${(err as Error).message}`);
        }
        const scored = calcFreeSpeak(transcribedText, hw.speakingText);
        score = scored.score;
        matchedWords = scored.matchedWords;
        totalWords = scored.totalWords;
      }
    }

    this.logger.log(`[session=${sessionId}] speaking score=${score} matched=${matchedWords}/${totalWords} mode=${speakingMode}`);
    return this.repo.saveSpeakingResult(sessionId, transcribedText, score, matchedWords, totalWords, phonemesJson);
  }

  async trySpeakingHomework(hwId: number, audioBuffer?: Buffer, mimeType?: string) {
    const hw = await this.prisma.homework.findUnique({
      where: { id: hwId },
      select: {
        type: true,
        speakingMode: true,
        speakingText: true,
        speakingPictureUrl: true,
      },
    });
    if (!hw) throw new NotFoundException(`Homework ${hwId} not found`);
    if (hw.type !== 'SPEAKING') throw new BadRequestException('Homework is not a SPEAKING type');
    if (!hw.speakingText) throw new BadRequestException('Homework has no speaking text');

    const speakingMode = hw.speakingMode ?? 'SCRIPT_MATCH';
    let transcribedText = '';
    let score = 0;
    let matchedWords = 0;
    let totalWords = hw.speakingText.trim().split(/\s+/).filter(Boolean).length;

    if (audioBuffer && audioBuffer.length > 0) {
      if (speakingMode === 'FREE_SPEAK') {
        try {
          const result = await this.bfa.transcribe(audioBuffer, mimeType ?? 'audio/webm');
          transcribedText = result.text;
          this.logger.log(`[try-speak hw=${hwId}] FREE_SPEAK transcription: "${transcribedText}"`);
        } catch (err) {
          this.logger.warn(`[try-speak hw=${hwId}] WhisperX error: ${(err as Error).message}`);
        }
        const scored = calcFreeSpeak(transcribedText, hw.speakingText);
        score = scored.score; matchedWords = scored.matchedWords; totalWords = scored.totalWords;
      } else {
        try {
          const bfaResult = await this.bfa.analyzeSpeaking(audioBuffer, mimeType ?? 'audio/webm', hw.speakingText);
          transcribedText = bfaResult.transcription?.text ?? '';
          score = bfaResult.overall_score;
          matchedWords = bfaResult.matched_words;
          totalWords = bfaResult.total_words;
          this.logger.log(`[try-speak hw=${hwId}] SCRIPT_MATCH score=${score} matched=${matchedWords}/${totalWords}`);
        } catch (err) {
          this.logger.warn(`[try-speak hw=${hwId}] BFA analyzeSpeaking error: ${(err as Error).message} — falling back to transcribe`);
          try {
            const result = await this.bfa.transcribe(audioBuffer, mimeType ?? 'audio/webm');
            transcribedText = result.text;
            const scored = calcSpeakingScore(transcribedText, hw.speakingText);
            score = scored.score; matchedWords = scored.matchedWords; totalWords = scored.totalWords;
          } catch (transcribeErr) {
            this.logger.warn(`[try-speak hw=${hwId}] Fallback transcribe error: ${(transcribeErr as Error).message}`);
          }
        }
      }
    }

    this.logger.log(`[try-speak hw=${hwId}] score=${score} matched=${matchedWords}/${totalWords} mode=${speakingMode}`);

    return {
      score,
      matchedWords,
      totalWords,
      transcribedText,
      speakingMode: hw.speakingMode,
      speakingPictureUrl: hw.speakingPictureUrl,
    };
  }

  async tryPhonicsHomework(hwId: number, wordId: number, audioBuffer?: Buffer, mimeType?: string) {
    const hw = await this.prisma.homework.findUnique({
      where: { id: hwId },
      select: {
        type: true,
        parts: { include: { words: true } },
      },
    });
    if (!hw) throw new NotFoundException(`Homework ${hwId} not found`);
    if (hw.type !== 'PHONICS') throw new BadRequestException('Homework is not a PHONICS type');

    let wordText = '';
    for (const part of hw.parts) {
      const found = part.words.find((w) => w.id === wordId);
      if (found) { wordText = found.text; break; }
    }
    if (!wordText) throw new BadRequestException(`Word ${wordId} not found in homework`);

    const wordRecord = await this.wordRepository.findByText(wordText.trim().toLowerCase());
    let expectedPhonemes: string[] = [];
    if (wordRecord?.phonemes) {
      try {
        const parsed = JSON.parse(wordRecord.phonemes);
        if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'string')) {
          expectedPhonemes = parsed;
        }
      } catch { /* malformed JSON */ }
    }

    let score = 0;
    let bfaResult: BfaAnalyzeResult | null = null;
    let transcribedText = '';

    if (audioBuffer && audioBuffer.length > 0) {
      try {
        bfaResult = await this.bfa.analyze(audioBuffer, mimeType ?? 'audio/webm', wordText, expectedPhonemes);
        this.logger.log(`[try-phonics hw=${hwId} word="${wordText}"] score=${bfaResult.score} success=${bfaResult.success}`);
        transcribedText = bfaResult.transcription?.text ?? '';
        score = bfaResult.success ? bfaResult.score : 0;
      } catch (err) {
        this.logger.warn(`[try-phonics hw=${hwId} word="${wordText}"] BFA error: ${(err as Error).message}`);
      }
    }

    return { score, transcribedText, wordText, bfa: bfaResult };
  }

  async savePhonicsResult(
    sessionId: number,
    dto: SavePhonicsResultDto,
    requestingStudentId?: number,
    audioBuffer?: Buffer,
    mimeType?: string,
  ) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (requestingStudentId !== undefined && session.studentId !== requestingStudentId) throw new ForbiddenException('Not your session');
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const hw = session.assignment.homework;
    if (hw.type !== 'PHONICS') throw new BadRequestException('Homework is not a PHONICS type');

    // Find the word text from parts
    let wordText = '';
    for (const part of hw.parts) {
      const found = part.words.find((w) => w.id === dto.wordId);
      if (found) { wordText = found.text; break; }
    }
    if (!wordText) throw new BadRequestException(`Word ${dto.wordId} not found in homework`);

    // Look up stored phonemes for this word (BFA-02: avoids espeak fallback for known words)
    const wordRecord = await this.wordRepository.findByText(wordText.trim().toLowerCase());
    let expectedPhonemes: string[] = [];
    if (wordRecord?.phonemes) {
      try {
        const parsed = JSON.parse(wordRecord.phonemes);
        if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'string')) {
          expectedPhonemes = parsed;
        }
      } catch {
        // malformed JSON in DB — fall through to [] -> espeak fallback
      }
    }

    let score = 0;
    let bfaResult: BfaAnalyzeResult | null = null;
    let transcribedText = dto.transcribedText ?? '';

    this.logger.log(
      `[session=${sessionId}] phonics word="${wordText}" audio=${audioBuffer ? `${audioBuffer.length}B ${mimeType}` : 'none'}`,
    );

    if (audioBuffer && audioBuffer.length > 0) {
      try {
        bfaResult = await this.bfa.analyze(
          audioBuffer,
          mimeType ?? 'audio/webm',
          wordText,
          expectedPhonemes,
        );
        this.logger.log(
          `[session=${sessionId}] BFA analyze: success=${bfaResult.success} score=${bfaResult.score} espeak_fallback=${bfaResult.espeak_fallback ?? false}`,
        );
        transcribedText = bfaResult.transcription?.text ?? transcribedText;
        score = bfaResult.success ? bfaResult.score : 0;
      } catch (err) {
        this.logger.warn(`[session=${sessionId}] BFA analyze error for "${wordText}": ${(err as Error).message}`);
      }
    }

    const result = await this.repo.savePhonicsResult(sessionId, dto.wordId, transcribedText, score);
    return { ...result, bfa: bfaResult };
  }

  async saveVocabResult(
    sessionId: number,
    dto: SaveVocabResultDto,
    requestingStudentId: number,
    audioBuffer?: Buffer,
    mimeType?: string,
  ) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.studentId !== requestingStudentId) {
      throw new ForbiddenException("Not your session");
    }
    if (session.completedAt) throw new BadRequestException('Session already completed');
    const hw = session.assignment.homework;
    if (hw.type !== 'VOCABULARY') throw new BadRequestException('Homework is not a VOCABULARY type');

    // Verify the VocabItem belongs to this homework (T-08-03: cross-homework tamper guard)
    const vocabItems = (hw as unknown as HwWithVocabItems).vocabItems ?? [];
    const vocabItem = vocabItems.find((vi) => vi.id === dto.vocabItemId);
    if (!vocabItem) throw new BadRequestException(`VocabItem ${dto.vocabItemId} not found in this homework`);

    let expectedPhonemes: string[] = [];
    if (vocabItem.phonemes) {
      try {
        const parsed = JSON.parse(vocabItem.phonemes);
        if (Array.isArray(parsed) && parsed.every((p) => typeof p === 'string')) {
          expectedPhonemes = parsed;
        }
      } catch { /* malformed JSON — fall through to [] */ }
    }

    let score = 0;
    let bfaResult: BfaAnalyzeResult | null = null;
    let transcribedText = dto.transcribedText ?? '';

    this.logger.log(
      `[session=${sessionId}] vocab word="${vocabItem.word}" audio=${audioBuffer ? `${audioBuffer.length}B ${mimeType}` : 'none'}`,
    );

    if (audioBuffer && audioBuffer.length > 0) {
      try {
        bfaResult = await this.bfa.analyze(
          audioBuffer,
          mimeType ?? 'audio/webm',
          vocabItem.word,
          expectedPhonemes,
        );
        this.logger.log(
          `[session=${sessionId}] BFA analyze vocab: success=${bfaResult.success} score=${bfaResult.score}`,
        );
        transcribedText = bfaResult.transcription?.text ?? transcribedText;
        score = bfaResult.success ? bfaResult.score : 0;
      } catch (err) {
        this.logger.warn(`[session=${sessionId}] BFA analyze error for vocab "${vocabItem.word}": ${(err as Error).message}`);
      }
    }

    const result = await this.repo.saveVocabResult(sessionId, dto.vocabItemId, transcribedText, score);
    return { ...result, bfa: bfaResult };
  }

  async saveReadingResult(sessionId: number, dto: SaveReadingResultDto) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const hw = session.assignment.homework;
    if (hw.type !== 'READING') throw new BadRequestException('Homework is not a READING type');

    if (dto.correctItems < 0) {
      throw new BadRequestException('correctItems must be non-negative');
    }

    // Compute totalItems server-side so client cannot inflate it
    const readingActivities = (hw as unknown as HwWithReadingActivities).readingActivities ?? [];
    const totalItems = readingActivities.reduce(
      (sum: number, act: { matchPairs: unknown[]; fillBlanks: unknown[] }) =>
        sum + (act.matchPairs?.length ?? 0) + (act.fillBlanks?.length ?? 0),
      0,
    );

    if (dto.correctItems > totalItems) {
      throw new BadRequestException('correctItems cannot exceed totalItems');
    }

    const score = totalItems > 0 ? Math.round((dto.correctItems / totalItems) * 100) : 0;
    this.logger.log(`[session=${sessionId}] reading score=${score} correct=${dto.correctItems}/${totalItems}`);
    return this.repo.saveReadingResult(sessionId, totalItems, dto.correctItems, score);
  }

  listSessions(assignmentId?: number, studentId?: number) {
    return this.repo.listSessions(assignmentId, studentId);
  }

  async saveListenResult(
    sessionId: number,
    dto: SaveListenResultDto,
    requestingStudentId: number,
    audioBuffer?: Buffer,
    mimeType?: string,
  ) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    if (session.studentId !== requestingStudentId) {
      throw new ForbiddenException('Not your session');
    }
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const hw = session.assignment.homework;
    if (hw.type !== 'LISTEN') throw new BadRequestException('Homework is not a LISTEN type');

    const listenItems = (hw as unknown as HwWithListenItems).listenItems ?? [];
    const listenItem = listenItems.find((li) => li.id === dto.listenItemId);
    if (!listenItem) throw new BadRequestException(`ListenItem ${dto.listenItemId} not found in this homework`);

    let transcript = dto.transcribedText ?? '';
    let pronScore = 0;
    let semanticScore = 0;
    let matchedKeywords: string[] = [];
    let bfaFeedbackJson: string | null = null;

    if (audioBuffer && audioBuffer.length > 0) {
      // Step 1: Transcribe only — use existing BfaService.transcribe (Azure STT, no BFA scoring)
      // This gives us transcript WITHOUT calling Azure PA, so D-09 threshold can gate BFA (D-05)
      try {
        const txResult = await this.bfa.transcribe(audioBuffer, mimeType ?? 'audio/webm');
        transcript = txResult.text ?? transcript;
        this.logger.log(`[session=${sessionId}] listen transcript="${transcript}"`);
      } catch (err) {
        this.logger.warn(`[session=${sessionId}] transcribe error: ${(err as Error).message}`);
      }

      // Step 2: Semantic score via bfa-service /score-semantic (D-04)
      let keywordsArr: string[] = [];
      try { keywordsArr = JSON.parse(listenItem.keywords); } catch { /* malformed keywords JSON */ }
      try {
        const semResult = await this.bfa.scoreSemantic(transcript, listenItem.expectedText, keywordsArr);
        semanticScore = semResult.semanticScore;
        matchedKeywords = semResult.matchedKeywords;
        this.logger.log(`[session=${sessionId}] listen semanticScore=${semanticScore} matched=${matchedKeywords.join(',')}`);
      } catch (err) {
        this.logger.warn(`[session=${sessionId}] scoreSemantic error: ${(err as Error).message}`);
      }

      // Step 3: Pronunciation scoring — ONLY if semantic >= 0.2 (D-09)
      // When keywords present, at least one must match; when none defined, semantic threshold alone gates.
      const keywordsOk = keywordsArr.length === 0 || matchedKeywords.length > 0;
      if (semanticScore >= 0.2 && keywordsOk) {
        try {
          const bfaResult = await this.bfa.analyzeSpeaking(
            audioBuffer,
            mimeType ?? 'audio/webm',
            listenItem.expectedText,
          );
          pronScore = bfaResult.success ? bfaResult.overall_score : 0;
          if (bfaResult.words && bfaResult.words.length > 0) {
            bfaFeedbackJson = JSON.stringify(bfaResult.words);
          }
          this.logger.log(`[session=${sessionId}] listen pronScore=${pronScore}`);
        } catch (err) {
          this.logger.warn(`[session=${sessionId}] BFA analyzeSpeaking error: ${(err as Error).message}`);
        }
      }
    }

    // D-06: composite formula — stored as 0.0–1.0
    // When semantic < 0.2: pronScore stays 0 (BFA never called), composite is purely semantic-weighted
    const compositeScore = semanticScore * 0.7 + (pronScore / 100) * 0.3;
    this.logger.log(`[session=${sessionId}] listen composite=${compositeScore.toFixed(4)} (sem=${semanticScore} pron=${pronScore})`);

    return this.repo.saveListenResult(
      sessionId,
      dto.listenItemId,
      transcript,
      semanticScore,
      pronScore,
      compositeScore,
      bfaFeedbackJson,
    );
  }

  async completeSession(sessionId: number) {
    const session = await this.repo.getSession(sessionId);
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const hw = session.assignment.homework;
    let avgScore = 0;

    if (hw.type === 'SPEAKING') {
      const sr = session.speakingResults[0];
      avgScore = sr ? sr.score : 0;
    } else if (hw.type === 'READING') {
      const rr = await this.repo.getReadingResult(sessionId);
      avgScore = rr ? rr.score : 0;
    } else if (hw.type === 'VOCABULARY') {
      const vocabResults = (session.phonicsResults ?? []).filter(
        (r: { vocabItemId?: number | null }) => r.vocabItemId != null,
      );
      const count = vocabResults.length;
      const scoreSum = vocabResults.reduce((s: number, r: { score: number }) => s + r.score, 0);
      avgScore = count > 0 ? scoreSum / count : 0;
    } else if (hw.type === 'LISTEN') {
      const listenResults = (session as unknown as SessionWithListenResults).listenResults ?? [];
      const count = listenResults.length;
      const scoreSum = listenResults.reduce((s: number, r: { compositeScore: unknown }) => s + Number(r.compositeScore), 0);
      // compositeScore is stored as 0.0–1.0; session score is 0–100
      avgScore = count > 0 ? (scoreSum / count) * 100 : 0;
    } else {
      const phonicsResults = session.phonicsResults ?? [];
      const totalWords = hw.parts.reduce((s: number, p: { words: unknown[] }) => s + p.words.length, 0);
      const scoreSum = phonicsResults.reduce((s: number, r: { score: number }) => s + r.score, 0);
      avgScore = totalWords > 0 ? scoreSum / totalWords : 0;
    }

    return this.repo.completeSession(sessionId, Math.round(avgScore));
  }
}

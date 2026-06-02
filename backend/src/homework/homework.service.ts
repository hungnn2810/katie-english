import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HomeworkRepository } from './homework.repository';
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto, CreateReadingHomeworkDto, UpdateReadingHomeworkDto, CreateVocabHomeworkDto, UpdateVocabHomeworkDto } from './homework.dto';

@Injectable()
export class HomeworkService {
  constructor(private readonly repo: HomeworkRepository) {}

  findAll() { return this.repo.findAll(); }

  async findById(id: number) {
    const hw = await this.repo.findById(id);
    if (!hw) throw new NotFoundException(`Homework ${id} not found`);
    return hw;
  }

  create(dto: CreateHomeworkDto) {
    if (dto.type === 'READING') this.validateReadingDto(dto);
    return this.repo.create(dto);
  }

  async update(id: number, dto: UpdateHomeworkDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  createAssignment(dto: CreateAssignmentDto) { return this.repo.createAssignment(dto); }

  async findAssignmentById(id: number) {
    const a = await this.repo.findAssignmentById(id);
    if (!a) throw new NotFoundException(`Assignment ${id} not found`);
    return a;
  }

  async updateAssignment(id: number, dto: UpdateAssignmentDto) {
    await this.findAssignmentById(id);
    return this.repo.updateAssignment(id, dto);
  }

  async deleteAssignment(id: number) {
    await this.findAssignmentById(id);
    return this.repo.deleteAssignment(id);
  }

  // ── Plan 03-04 reading — real service logic ──────────────────────────────

  async findReadingById(id: number) {
    const hw = await this.repo.findReadingById(id);
    if (!hw) throw new NotFoundException(`Reading homework ${id} not found`);
    return hw;
  }

  createReadingHomework(dto: CreateReadingHomeworkDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Name is required');
    }
    if (!Array.isArray(dto.activities) || dto.activities.length === 0) {
      throw new BadRequestException('At least one activity is required');
    }
    if (dto.activities.length > 50) {
      throw new BadRequestException('Too many activities (max 50)');
    }
    this.validateReadingActivities(dto.activities);
    return this.repo.createReadingHomework(dto);
  }

  async updateReadingHomework(id: number, dto: UpdateReadingHomeworkDto) {
    await this.findReadingById(id);
    if (dto.activities !== undefined) {
      if (!Array.isArray(dto.activities) || dto.activities.length === 0) {
        throw new BadRequestException('At least one activity is required');
      }
      if (dto.activities.length > 50) {
        throw new BadRequestException('Too many activities (max 50)');
      }
      this.validateReadingActivities(dto.activities);
    }
    return this.repo.updateReadingHomework(id, dto);
  }

  private validateReadingActivities(activities: import('./homework.dto').CreateReadingActivityDto[]): void {
    for (const act of activities) {
      if (act.type === 'MATCH') {
        const pairCount = act.pairs?.length ?? 0;
        if (pairCount < 2) {
          throw new BadRequestException('Matching activities require at least 2 pairs');
        }
        if (pairCount > 30) {
          throw new BadRequestException('Too many pairs (max 30)');
        }
      } else if (act.type === 'FILL_BLANK') {
        const segs = act.segments ?? [];
        if (segs.length === 0) {
          throw new BadRequestException('Fill-in-blank activities require at least one segment');
        }
        if (segs.length > 200) {
          throw new BadRequestException('Too many segments (max 200)');
        }
        const blankSegs = segs.filter((s) => s.blank);
        if (blankSegs.length === 0) {
          throw new BadRequestException('Fill-in-blank activities require at least one blank segment');
        }
        // Validate blankIndex contiguity (Pitfall 3)
        const blankIndices = blankSegs
          .map((s) => s.blankIndex ?? -1)
          .filter((i) => i >= 0)
          .sort((a, b) => a - b);
        const isContiguous = blankIndices.every((v, i) => v === i);
        if (blankIndices.length > 0 && !isContiguous) {
          throw new BadRequestException('Fill-in-blank blankIndex values must be contiguous starting at 0');
        }
      }
    }
  }

  // ── Plan 08-02 vocab service methods ─────────────────────────────────────

  async findVocabById(id: number) {
    const hw = await this.repo.findVocabById(id);
    if (!hw) throw new NotFoundException(`Vocabulary homework ${id} not found`);
    return hw;
  }

  createVocabHomework(dto: CreateVocabHomeworkDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Name is required');
    }
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }
    if (dto.items.length > 10) {
      throw new BadRequestException('Too many items (max 10)');
    }
    for (const item of dto.items) {
      if (!item.word?.trim()) {
        throw new BadRequestException('Each item must have a non-empty word');
      }
      if (!item.imageUrl?.trim()) {
        throw new BadRequestException('Each item must have a non-empty imageUrl');
      }
    }
    return this.repo.createVocabHomework(dto);
  }

  async updateVocabHomework(id: number, dto: UpdateVocabHomeworkDto) {
    await this.findVocabById(id);
    if (dto.items !== undefined) {
      if (!Array.isArray(dto.items) || dto.items.length === 0) {
        throw new BadRequestException('At least one item is required');
      }
      if (dto.items.length > 10) {
        throw new BadRequestException('Too many items (max 10)');
      }
      for (const item of dto.items) {
        if (!item.word?.trim()) {
          throw new BadRequestException('Each item must have a non-empty word');
        }
        if (!item.imageUrl?.trim()) {
          throw new BadRequestException('Each item must have a non-empty imageUrl');
        }
      }
    }
    return this.repo.updateVocabHomework(id, dto);
  }

  private validateReadingDto(dto: CreateHomeworkDto): void {
    for (const act of (dto.readingActivities ?? [])) {
      if (act.type === 'MATCH') {
        const pairCount = act.pairs?.length ?? 0;
        if (pairCount < 2 || pairCount > 6) {
          throw new BadRequestException('Matching activity must have 2 to 6 pairs');
        }
      } else if (act.type === 'FILL_BLANK') {
        for (const item of (act.items ?? [])) {
          const choiceCount = item.choices?.length ?? 0;
          if (choiceCount < 2) {
            throw new BadRequestException('Each fill-blank item must have at least 2 choices');
          }
          const correctCount = item.choices.filter((c) => c.isCorrect).length;
          if (correctCount !== 1) {
            throw new BadRequestException('Each fill-blank item must have exactly one isCorrect=true choice');
          }
        }
      }
    }
  }
}

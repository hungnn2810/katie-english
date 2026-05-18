import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HomeworkRepository } from './homework.repository';
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto, CreateReadingHomeworkDto, UpdateReadingHomeworkDto } from './homework.dto';

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

  // ── Plan 03-01 reading stubs (real logic in Plan 04) ─────────────────────

  async findReadingById(id: number) {
    const hw = await this.repo.findReadingById(id);
    if (!hw) throw new NotFoundException(`Reading homework ${id} not found`);
    return hw;
  }

  createReadingHomework(dto: CreateReadingHomeworkDto) {
    return this.repo.createReadingHomework(dto);
  }

  async updateReadingHomework(id: number, dto: UpdateReadingHomeworkDto) {
    await this.findReadingById(id);
    return this.repo.updateReadingHomework(id, dto);
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

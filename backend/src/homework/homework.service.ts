import { Injectable, NotFoundException } from '@nestjs/common';
import { HomeworkRepository } from './homework.repository';
import { CreateHomeworkDto, UpdateHomeworkDto } from './homework.dto';

@Injectable()
export class HomeworkService {
  constructor(private readonly repo: HomeworkRepository) {}

  findAll() { return this.repo.findAll(); }
  findByClass(classId: number) { return this.repo.findByClass(classId); }

  async findById(id: number) {
    const hw = await this.repo.findById(id);
    if (!hw) throw new NotFoundException(`Homework ${id} not found`);
    return hw;
  }

  create(dto: CreateHomeworkDto) { return this.repo.create(dto); }

  async update(id: number, dto: UpdateHomeworkDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}

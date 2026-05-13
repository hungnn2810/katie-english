import { Injectable, NotFoundException } from '@nestjs/common';
import { HomeworkRepository } from './homework.repository';
import { CreateHomeworkDto, UpdateHomeworkDto, CreateAssignmentDto, UpdateAssignmentDto } from './homework.dto';

@Injectable()
export class HomeworkService {
  constructor(private readonly repo: HomeworkRepository) {}

  findAll() { return this.repo.findAll(); }

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
}

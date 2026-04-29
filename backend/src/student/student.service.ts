import { Injectable, NotFoundException } from '@nestjs/common';
import { StudentRepository } from './student.repository';
import { CreateStudentDto, UpdateStudentDto } from './student.dto';

@Injectable()
export class StudentService {
  constructor(private readonly repo: StudentRepository) {}

  findAll() { return this.repo.findAll(); }
  findByClass(classId: number) { return this.repo.findByClass(classId); }

  async findById(id: number) {
    const s = await this.repo.findById(id);
    if (!s) throw new NotFoundException(`Student ${id} not found`);
    return s;
  }

  create(dto: CreateStudentDto) { return this.repo.create(dto); }

  async update(id: number, dto: UpdateStudentDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}

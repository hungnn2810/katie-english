import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ClassRepository } from './class.repository';
import { CreateClassDto, UpdateClassDto, AssignHomeworkDto } from './class.dto';

@Injectable()
export class ClassService {
  constructor(private readonly classRepository: ClassRepository) {}

  findAll() {
    return this.classRepository.findAll();
  }

  async findById(id: number) {
    const cls = await this.classRepository.findById(id);
    if (!cls) throw new NotFoundException(`Class ${id} not found`);
    return cls;
  }

  create(dto: CreateClassDto) {
    return this.classRepository.create(dto);
  }

  async update(id: number, dto: UpdateClassDto) {
    await this.findById(id);
    return this.classRepository.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.classRepository.delete(id);
  }

  async addStudent(classId: number, studentId: number) {
    await this.findById(classId);
    try {
      return await this.classRepository.addStudent(classId, studentId);
    } catch {
      throw new ConflictException(`Student ${studentId} already in class ${classId}`);
    }
  }

  async removeStudent(classId: number, studentId: number) {
    await this.findById(classId);
    return this.classRepository.removeStudent(classId, studentId);
  }

  async addHomework(classId: number, homeworkId: number, dto: AssignHomeworkDto) {
    await this.findById(classId);
    try {
      return await this.classRepository.addHomework(
        classId,
        homeworkId,
        dto.dueDate ? new Date(dto.dueDate) : undefined,
      );
    } catch {
      throw new ConflictException(`Homework ${homeworkId} already assigned to class ${classId}`);
    }
  }

  async removeHomework(classId: number, homeworkId: number) {
    await this.findById(classId);
    return this.classRepository.removeHomework(classId, homeworkId);
  }
}

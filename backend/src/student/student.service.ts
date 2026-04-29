import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { StudentRepository } from './student.repository';
import { CreateStudentDto, UpdateStudentDto } from './student.dto';

@Injectable()
export class StudentService {
  constructor(private readonly studentRepository: StudentRepository) {}

  findAll() {
    return this.studentRepository.findAll();
  }

  async findById(id: number) {
    const student = await this.studentRepository.findById(id);
    if (!student) throw new NotFoundException(`Student ${id} not found`);
    return student;
  }

  async create(dto: CreateStudentDto) {
    try {
      return await this.studentRepository.create(dto);
    } catch {
      throw new ConflictException(`Email ${dto.email} already exists`);
    }
  }

  async update(id: number, dto: UpdateStudentDto) {
    await this.findById(id);
    return this.studentRepository.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.studentRepository.delete(id);
  }
}

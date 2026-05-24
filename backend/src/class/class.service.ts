import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ClassRepository } from './class.repository';
import { CreateClassDto, UpdateClassDto } from './class.dto';

@Injectable()
export class ClassService {
  constructor(private readonly repo: ClassRepository) {}

  findAll() { return this.repo.findAll(); }

  async findById(id: number) {
    const cls = await this.repo.findById(id);
    if (!cls) throw new NotFoundException(`Class ${id} not found`);
    return cls;
  }

  async create(dto: CreateClassDto, teacherId?: number) {
    try { return await this.repo.create(dto, teacherId); }
    catch { throw new ConflictException(`Code ${dto.code} already exists`); }
  }

  async update(id: number, dto: UpdateClassDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}

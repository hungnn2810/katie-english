import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ClassRepository } from './class.repository';
import { CreateClassDto, UpdateClassDto } from './class.dto';

function computeStatus(startDate: Date, endDate: Date): 'PENDING' | 'INPROGRESS' | 'ENDED' {
  const now = new Date();
  if (now < startDate) return 'PENDING';
  if (now > endDate) return 'ENDED';
  return 'INPROGRESS';
}

@Injectable()
export class ClassService {
  constructor(private readonly repo: ClassRepository) {}

  async findAll() {
    const classes = await this.repo.findAll();
    return classes.map(c => ({ ...c, status: computeStatus(c.startDate, c.endDate) as any }));
  }

  async findById(id: number) {
    const cls = await this.repo.findById(id);
    if (!cls) throw new NotFoundException(`Class ${id} not found`);
    return { ...cls, status: computeStatus(cls.startDate, cls.endDate) as any };
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

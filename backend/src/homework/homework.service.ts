import { Injectable, NotFoundException } from '@nestjs/common';
import { HomeworkRepository } from './homework.repository';
import { CreateHomeworkDto, UpdateHomeworkDto } from './homework.dto';

@Injectable()
export class HomeworkService {
  constructor(private readonly homeworkRepository: HomeworkRepository) {}

  findAll() {
    return this.homeworkRepository.findAll();
  }

  async findById(id: number) {
    const hw = await this.homeworkRepository.findById(id);
    if (!hw) throw new NotFoundException(`Homework ${id} not found`);
    return hw;
  }

  create(dto: CreateHomeworkDto) {
    return this.homeworkRepository.create(dto);
  }

  async update(id: number, dto: UpdateHomeworkDto) {
    await this.findById(id);
    return this.homeworkRepository.update(id, dto);
  }

  async delete(id: number) {
    await this.findById(id);
    return this.homeworkRepository.delete(id);
  }
}

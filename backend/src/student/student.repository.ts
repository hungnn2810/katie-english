import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './student.dto';

@Injectable()
export class StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.student.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: number) {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        classes: { include: { class: true } },
      },
    });
  }

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({ data: dto });
  }

  update(id: number, dto: UpdateStudentDto) {
    return this.prisma.student.update({ where: { id }, data: dto });
  }

  delete(id: number) {
    return this.prisma.student.delete({ where: { id } });
  }
}

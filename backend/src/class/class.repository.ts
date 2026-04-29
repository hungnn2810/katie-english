import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './class.dto';

@Injectable()
export class ClassRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.class.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { students: true, homeworks: true } },
      },
    });
  }

  findById(id: number) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        students: { include: { student: true } },
        homeworks: {
          include: {
            homework: {
              include: {
                phonemes: { orderBy: { orderIndex: 'asc' }, include: { phoneme: true } },
              },
            },
          },
        },
      },
    });
  }

  create(dto: CreateClassDto) {
    return this.prisma.class.create({ data: dto });
  }

  update(id: number, dto: UpdateClassDto) {
    return this.prisma.class.update({ where: { id }, data: dto });
  }

  delete(id: number) {
    return this.prisma.class.delete({ where: { id } });
  }

  addStudent(classId: number, studentId: number) {
    return this.prisma.studentClass.create({ data: { classId, studentId } });
  }

  removeStudent(classId: number, studentId: number) {
    return this.prisma.studentClass.delete({
      where: { studentId_classId: { studentId, classId } },
    });
  }

  addHomework(classId: number, homeworkId: number, dueDate?: Date) {
    return this.prisma.classHomework.create({
      data: { classId, homeworkId, dueDate },
    });
  }

  removeHomework(classId: number, homeworkId: number) {
    return this.prisma.classHomework.delete({
      where: { classId_homeworkId: { classId, homeworkId } },
    });
  }
}

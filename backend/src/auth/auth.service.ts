import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './jwt.service';
import { LoginDto, RegisterDto, ApproveStudentDto } from './auth.dto';
import * as bcrypt from 'bcryptjs';
import { UserRole, Sex, ParentType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { upn: dto.upn } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.approved) throw new ForbiddenException('Account pending approval');
    const token = this.tokenService.sign({
      sub: user.id, upn: user.upn, role: user.role as 'TEACHER' | 'STUDENT', studentId: user.studentId ?? undefined,
    });
    return { token, user: { id: user.id, upn: user.upn, role: user.role, studentId: user.studentId } };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { upn: dto.upn } });
    if (existing) throw new ConflictException('UPN already registered');
    const hashed = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.create({
      data: { upn: dto.upn, password: hashed, role: UserRole.STUDENT, approved: false },
    });
    return { pending: true };
  }

  async listPendingStudents() {
    return this.prisma.user.findMany({
      where: { role: UserRole.STUDENT, approved: false },
      select: { id: true, upn: true, createdAt: true, studentId: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveStudent(dto: ApproveStudentDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.STUDENT) throw new ForbiddenException('Only students can be approved');

    let studentId = dto.studentId;

    if (!studentId) {
      if (!dto.fullname || !dto.sex || !dto.dateOfBirth) {
        throw new BadRequestException('Provide studentId or student info (fullname, sex, dateOfBirth)');
      }
      const student = await this.prisma.student.create({
        data: {
          fullname: dto.fullname,
          sex: dto.sex as Sex,
          dateOfBirth: new Date(dto.dateOfBirth),
          classId: dto.classId ?? null,
          parents: dto.parents ? {
            create: dto.parents.map((p) => ({
              name: p.name, phoneNumber: p.phoneNumber, type: p.type as ParentType,
            })),
          } : undefined,
        },
      });
      studentId = student.id;
    }

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { approved: true, studentId },
    });
    return { approved: true, studentId };
  }

  async me(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, upn: true, role: true, studentId: true, approved: true },
    });
  }
}

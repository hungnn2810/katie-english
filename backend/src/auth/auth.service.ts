import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './jwt.service';
import { LoginDto, RegisterDto, ApproveStudentDto, ChangePasswordDto, ForgotPasswordDto, ResetStudentPasswordDto } from './auth.dto';
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
      data: {
        upn: dto.upn,
        password: hashed,
        role: UserRole.STUDENT,
        approved: false,
        registrationData: {
          fullname: dto.fullname,
          sex: dto.sex,
          dateOfBirth: dto.dateOfBirth,
          classId: dto.classId ?? null,
          parents: dto.parents,
        },
      },
    });
    return { pending: true };
  }

  async listPendingStudents() {
    return this.prisma.user.findMany({
      where: { role: UserRole.STUDENT, approved: false },
      select: { id: true, upn: true, createdAt: true, registrationData: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveStudent(dto: ApproveStudentDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.STUDENT) throw new ForbiddenException('Only students can be approved');

    let studentId = dto.studentId;

    if (!studentId) {
      const reg = (user.registrationData ?? {}) as {
        fullname?: string; sex?: string; dateOfBirth?: string; classId?: number | null;
        parents?: { name: string; phoneNumber: string; type: string }[];
      };
      const fullname = dto.fullname ?? reg.fullname;
      const sex = dto.sex ?? reg.sex;
      const dateOfBirth = dto.dateOfBirth ?? reg.dateOfBirth;

      if (!fullname || !sex || !dateOfBirth) {
        throw new BadRequestException('Student info missing: provide fullname, sex, dateOfBirth');
      }

      const parents = dto.parents ?? reg.parents ?? [];
      const classId = dto.classId !== undefined ? dto.classId : (reg.classId ?? null);

      const student = await this.prisma.student.create({
        data: {
          fullname,
          sex: sex as Sex,
          dateOfBirth: new Date(dateOfBirth),
          classId: classId ?? null,
          parents: parents.length > 0 ? {
            create: parents.map((p) => ({
              name: p.name, phoneNumber: p.phoneNumber, type: p.type as ParentType,
            })),
          } : undefined,
        },
      });
      studentId = student.id;
    }

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { approved: true, studentId, registrationData: undefined },
    });
    return { approved: true, studentId };
  }

  async me(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, upn: true, role: true, studentId: true, approved: true },
    });
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    if (dto.newPassword.length < 6) throw new BadRequestException('New password must be at least 6 characters');
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { upn: dto.upn } });
    if (!user || user.role !== UserRole.STUDENT) {
      // Return same response regardless — don't leak whether UPN exists
      return { requested: true };
    }
    if (!user.approved) throw new ForbiddenException('Account not yet approved');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetRequested: true },
    });
    return { requested: true };
  }

  async listPasswordResetRequests() {
    return this.prisma.user.findMany({
      where: { role: UserRole.STUDENT, approved: true, passwordResetRequested: true },
      select: { id: true, upn: true, createdAt: true, student: { select: { fullname: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async resetStudentPassword(dto: ResetStudentPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.STUDENT) throw new ForbiddenException('Can only reset student passwords');
    if (dto.newPassword.length < 6) throw new BadRequestException('Password must be at least 6 characters');
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { password: hashed, passwordResetRequested: false },
    });
    return { success: true };
  }
}

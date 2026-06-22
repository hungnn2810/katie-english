import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard, TeacherGuard } from './auth.guard';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ApproveStudentDto,
  ResetStudentPasswordDto,
  ChangePasswordDto,
} from './auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    forgotPassword: jest.fn(),
    listPendingStudents: jest.fn(),
    approveStudent: jest.fn(),
    listPasswordResetRequests: jest.fn(),
    resetStudentPassword: jest.fn(),
    me: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuthGuard, useValue: { canActivate: () => true } },
        { provide: TeacherGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TeacherGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call authService.login with dto and return result', async () => {
      const dto: LoginDto = { upn: 'testuser@test.com', password: 'password123' };
      const result = { access_token: 'jwt-token' };
      authService.login.mockResolvedValue(result as any);

      const response = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('register', () => {
    it('should call authService.register with dto and return result', async () => {
      const dto: RegisterDto = {
        upn: 'newuser@test.com',
        password: 'password123',
        fullname: 'New User',
        sex: 'MALE',
        dateOfBirth: '2000-01-01',
        parents: [],
      };
      const result = { id: 1, upn: 'newuser@test.com' };
      authService.register.mockResolvedValue(result as any);

      const response = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(authService.register).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with dto and return result', async () => {
      const dto: ForgotPasswordDto = { upn: 'testuser@test.com' };
      const result = { message: 'Password reset request submitted' };
      authService.forgotPassword.mockResolvedValue(result as any);

      const response = await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(authService.forgotPassword).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('pendingStudents', () => {
    it('should call authService.listPendingStudents and return result', async () => {
      const result = [{ id: 1, username: 'student1' }];
      authService.listPendingStudents.mockResolvedValue(result as any);

      const response = await controller.pendingStudents();

      expect(authService.listPendingStudents).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('approveStudent', () => {
    it('should call authService.approveStudent with dto and return result', async () => {
      const dto: ApproveStudentDto = { userId: 2 };
      const result = { id: 2, approved: true };
      authService.approveStudent.mockResolvedValue(result as any);

      const response = await controller.approveStudent(dto);

      expect(authService.approveStudent).toHaveBeenCalledWith(dto);
      expect(authService.approveStudent).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('passwordResetRequests', () => {
    it('should call authService.listPasswordResetRequests and return result', async () => {
      const result = [{ id: 1, username: 'student1', requestedAt: new Date() }];
      authService.listPasswordResetRequests.mockResolvedValue(result as any);

      const response = await controller.passwordResetRequests();

      expect(authService.listPasswordResetRequests).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('resetStudentPassword', () => {
    it('should call authService.resetStudentPassword with dto and return result', async () => {
      const dto: ResetStudentPasswordDto = { userId: 2, newPassword: 'newpass123' };
      const result = { message: 'Password reset successfully' };
      authService.resetStudentPassword.mockResolvedValue(result as any);

      const response = await controller.resetStudentPassword(dto);

      expect(authService.resetStudentPassword).toHaveBeenCalledWith(dto);
      expect(authService.resetStudentPassword).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('me', () => {
    it('should call authService.me with user.sub from request and return result', async () => {
      const mockReq = { user: { sub: 1, role: 'TEACHER' } } as any;
      const result = { id: 1, username: 'testuser', role: 'TEACHER' };
      authService.me.mockResolvedValue(result as any);

      const response = await controller.me(mockReq);

      expect(authService.me).toHaveBeenCalledWith(1);
      expect(authService.me).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with user.sub and dto and return result', async () => {
      const mockReq = { user: { sub: 1, role: 'TEACHER' } } as any;
      const dto: ChangePasswordDto = { currentPassword: 'oldpass', newPassword: 'newpass123' };
      const result = { message: 'Password changed successfully' };
      authService.changePassword.mockResolvedValue(result as any);

      const response = await controller.changePassword(mockReq, dto);

      expect(authService.changePassword).toHaveBeenCalledWith(1, dto);
      expect(authService.changePassword).toHaveBeenCalledTimes(1);
      expect(response).toBe(result);
    });
  });
});

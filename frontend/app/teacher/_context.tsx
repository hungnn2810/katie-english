'use client';
import { createContext, useContext } from 'react';
import { AuthUser } from '@/lib/auth';

export const TeacherUserContext = createContext<AuthUser | null>(null);
export const useTeacher = () => useContext(TeacherUserContext)!;

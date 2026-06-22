'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, getStudentToken } from '@/lib/auth';
import { getAdminUser } from '@/lib/admin-auth';

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getAdminUser()) { router.replace('/admin'); return; }
    const user = getUser();
    if (user?.role === 'TEACHER') { router.replace('/teacher'); return; }
    if (user?.role === 'STUDENT') { router.replace('/student/homework'); return; }
    if (getStudentToken()) { router.replace('/student/homework'); return; }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '4px solid #E5E7EB', borderTopColor: '#F0623A', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF7F5 0%, #F5F3FF 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F0623A', color: '#fff', fontWeight: 900, fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>K</div>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#1F2937' }}>Katie English</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1F2937', textAlign: 'center', marginBottom: 8, lineHeight: 1.2 }}>
        Bạn đăng nhập với tư cách nào?
      </h1>
      <p style={{ color: '#6B7280', fontSize: 15, marginBottom: 40, textAlign: 'center' }}>
        Chọn vai trò để tiếp tục
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 400 }}>
        {/* Teacher card */}
        <a href="/teacher/login" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#fff',
            border: '2px solid rgba(240,98,58,0.2)',
            borderRadius: 20,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 2px 12px rgba(240,98,58,0.08)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#F0623A'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(240,98,58,0.18)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(240,98,58,0.2)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(240,98,58,0.08)'; }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(240,98,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 26 }}>
              👩‍🏫
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#1F2937', marginBottom: 2 }}>Giáo viên</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>Quản lý lớp, bài tập và học sinh</div>
            </div>
            <div style={{ marginLeft: 'auto', color: '#F0623A', fontSize: 20 }}>→</div>
          </div>
        </a>

        {/* Student card */}
        <a href="/student/login" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#fff',
            border: '2px solid rgba(167,139,250,0.2)',
            borderRadius: 20,
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 2px 12px rgba(167,139,250,0.08)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#A78BFA'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(167,139,250,0.18)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(167,139,250,0.2)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(167,139,250,0.08)'; }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 26 }}>
              🎒
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#1F2937', marginBottom: 2 }}>Học sinh</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>Làm bài tập và luyện tiếng Anh</div>
            </div>
            <div style={{ marginLeft: 'auto', color: '#A78BFA', fontSize: 20 }}>→</div>
          </div>
        </a>
      </div>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth, changePassword, AuthUser } from '@/lib/auth';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import { LayoutDashboard, School, Users, BookOpen, Video, Receipt, Upload, KeyRound, LogOut, X } from 'lucide-react';

const SIDEBAR_BG = '#0F1B2D';
const ACCENT = '#22C55E';
const ACCENT_BG = 'rgba(34,197,94,0.15)';
const ACCENT_TEXT = '#86EFAC';

const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: '/teacher', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'GENERAL',
    items: [
      { href: '/teacher/classes', label: 'Classes', icon: School },
      { href: '/teacher/students', label: 'Students', icon: Users },
      { href: '/teacher/homework', label: 'Homework', icon: BookOpen },
      { href: '/teacher/sessions', label: 'Sessions', icon: Video },
      { href: '/teacher/tuition', label: 'Tuition', icon: Receipt },
      { href: '/teacher/import', label: 'Import', icon: Upload },
    ],
  },
];

interface Props {
  user: AuthUser;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function TeacherShell({ user, children, title, subtitle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const showUserMenu = Boolean(anchorEl);
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const pwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (pwTimerRef.current) clearTimeout(pwTimerRef.current); };
  }, []);

  function logout() { clearAuth(); router.push('/teacher/login'); }

  function handleMenuOpen(event: React.MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
    setShowPwForm(false);
  }

  function handleMenuClose() {
    if (pwTimerRef.current) { clearTimeout(pwTimerRef.current); pwTimerRef.current = null; }
    setAnchorEl(null);
    setShowPwForm(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(''); setPwSuccess(false); setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw(''); setNewPw('');
      if (pwTimerRef.current) clearTimeout(pwTimerRef.current);
      pwTimerRef.current = setTimeout(() => { setShowPwForm(false); setPwSuccess(false); handleMenuClose(); }, 1800);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed');
    } finally { setPwLoading(false); }
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', minWidth: 1280 }}>
      {/* Sidebar — dark navy like HeyWord */}
      <Box sx={{
        width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
        bgcolor: SIDEBAR_BG,
      }}>
        {/* Logo */}
        <Box sx={{ px: '20px', pt: '24px', pb: '20px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: '10px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0, bgcolor: ACCENT,
            }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 14 }}>K</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                Katie English
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 10, letterSpacing: '0.05em', mt: '2px' }}>
                Teacher Portal
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Nav */}
        <Box sx={{ flex: 1, px: '10px', overflowY: 'auto' }}>
          {NAV_GROUPS.map((group, gi) => (
            <Box key={gi} sx={{ mt: gi > 0 ? '18px' : 0 }}>
              {group.label && (
                <Typography variant="caption" sx={{
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: '#475569', px: '12px', mb: '6px', display: 'block', fontSize: 10,
                }}>
                  {group.label}
                </Typography>
              )}
              <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/teacher' && pathname.startsWith(item.href));
                  return (
                    <ListItem key={item.href} disablePadding>
                      <ListItemButton
                        component={Link}
                        href={item.href}
                        selected={active}
                        sx={{
                          borderRadius: '10px', py: '10px', px: '12px', position: 'relative',
                          '&.Mui-selected': { bgcolor: ACCENT_BG, color: ACCENT_TEXT },
                          '&.Mui-selected:hover': { bgcolor: ACCENT_BG },
                          '&:not(.Mui-selected)': { color: '#94A3B8' },
                          '&:not(.Mui-selected):hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#E2E8F0' },
                        }}
                      >
                        {active && (
                          <Box sx={{
                            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                            width: 3, height: 18, borderRadius: '0 4px 4px 0', bgcolor: ACCENT,
                          }} />
                        )}
                        <ListItemIcon sx={{ minWidth: '30px', color: 'inherit' }}>
                          <item.icon size={15} />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          slotProps={{ primary: { sx: { fontSize: 14, fontWeight: active ? 600 : 400 } } }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        {/* Sidebar footer */}
        <Box sx={{ px: '20px', pb: '18px', pt: '12px' }}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: '12px' }} />
          <Typography sx={{ fontSize: 10, color: '#475569', textAlign: 'center' }}>
            © Katie English
          </Typography>
        </Box>
      </Box>

      {/* Main */}
      <Box sx={{ flex: 1, bgcolor: '#F7F9FC', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box component="main" sx={{ flex: 1, overflowY: 'auto' }}>
          {/* Page header — HeyWord style: greeting + bold title */}
          <Box sx={{ px: '32px', pt: '28px', pb: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontSize: 12, color: '#F97316', fontWeight: 700, mb: '5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                👋 Chào {user.upn?.split('@')[0] ?? 'Teacher'},
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {title}
                </Typography>
                <Box component="span" sx={{ fontSize: 20, lineHeight: 1 }}>✨</Box>
              </Box>
              {subtitle && (
                <Typography sx={{ fontSize: 13, color: '#6B7280', mt: '6px' }}>{subtitle}</Typography>
              )}
            </Box>

            {/* User avatar button */}
            <Box sx={{ position: 'relative', flexShrink: 0, mt: 0.5 }}>
              <IconButton
                onClick={handleMenuOpen}
                aria-label="Open account menu"
                aria-haspopup="true"
                aria-expanded={showUserMenu}
                sx={{
                  width: 36, height: 36, borderRadius: '50%', bgcolor: '#22C55E',
                  color: 'white', fontWeight: 700, fontSize: 14,
                  '&:hover': { bgcolor: '#16A34A' },
                }}
              >
                {(user.upn?.[0] ?? '?').toUpperCase()}
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={showUserMenu}
                onClose={handleMenuClose}
                slotProps={{ paper: { sx: { width: 288, borderRadius: 3, p: 1, mt: 1 } } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                {/* User info row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white',
                      flexShrink: 0, bgcolor: '#22C55E',
                    }}>
                      {(user.upn?.[0] ?? '?').toUpperCase()}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.upn}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Teacher</Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={handleMenuClose} aria-label="Close menu" sx={{ color: 'text.secondary' }}>
                    <X size={14} />
                  </IconButton>
                </Box>

                {/* Change password toggle */}
                <MenuItem
                  onClick={() => { setShowPwForm((v) => !v); setPwError(''); setPwSuccess(false); }}
                  sx={{ borderRadius: 2, fontSize: 14, color: 'text.secondary', gap: 1 }}
                >
                  <KeyRound size={14} />
                  Change password
                </MenuItem>

                {showPwForm && (
                  <Box component="form" onSubmit={handleChangePassword} sx={{ px: 1, py: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <TextField
                      type="password"
                      placeholder="Current password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      required
                      size="small"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: 12 } }}
                    />
                    <TextField
                      type="password"
                      placeholder="New password (min 6)"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      required
                      slotProps={{ htmlInput: { minLength: 6 } }}
                      size="small"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: 12 } }}
                    />
                    {pwError && <Alert severity="error" sx={{ borderRadius: 2, py: 0, fontSize: 11 }}>{pwError}</Alert>}
                    {pwSuccess && <Alert severity="success" sx={{ borderRadius: 2, py: 0, fontSize: 11 }}>Password updated!</Alert>}
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={pwLoading}
                      sx={{ bgcolor: '#22C55E', '&:hover': { bgcolor: '#16A34A' }, borderRadius: 3, fontSize: 12 }}
                    >
                      {pwLoading ? 'Updating...' : 'Update password'}
                    </Button>
                  </Box>
                )}

                <Divider sx={{ my: 0.5 }} />

                {/* Sign out */}
                <MenuItem onClick={logout} sx={{ borderRadius: 2, color: 'error.main', fontSize: 14, gap: 1, mt: 0.5 }}>
                  <LogOut size={14} />
                  Sign out
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ px: '32px', pb: '32px' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

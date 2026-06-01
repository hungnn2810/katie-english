'use client';
import Link from 'next/link';
import { useState } from 'react';
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
import { LayoutDashboard, School, Users, BookOpen, Video, KeyRound, LogOut, X } from 'lucide-react';

const ACCENT = '#F0623A';
const ACCENT_BG = 'rgba(240, 98, 58, 0.12)';
const ACCENT_TEXT = '#FDA087';

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

  function logout() { clearAuth(); router.push('/login'); }

  function handleMenuOpen(event: React.MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
    setShowPwForm(false);
  }

  function handleMenuClose() {
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
      setTimeout(() => { setShowPwForm(false); setPwSuccess(false); handleMenuClose(); }, 1800);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed');
    } finally { setPwLoading(false); }
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', minWidth: 1280 }}>
      {/* Sidebar */}
      <Box sx={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        bgcolor: '#0C1220', boxShadow: '1px 0 0 rgba(255,255,255,0.05)',
      }}>
        {/* Logo */}
        <Box sx={{ px: 2.5, pt: 3.5, pb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 3, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0, boxShadow: 3, bgcolor: ACCENT,
            }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 14 }}>K</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                Katie English
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 10, letterSpacing: '0.05em', mt: 0.5 }}>
                Teacher Portal
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Nav */}
        <Box sx={{ flex: 1, px: 1.5, overflowY: 'auto' }}>
          {NAV_GROUPS.map((group, gi) => (
            <Box key={gi} sx={{ mt: gi > 0 ? 2.5 : 0 }}>
              {group.label && (
                <Typography variant="caption" sx={{
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: '#475569', px: 1.5, mb: 0.75, display: 'block',
                }}>
                  {group.label}
                </Typography>
              )}
              <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/teacher' && pathname.startsWith(item.href));
                  return (
                    <ListItem key={item.href} disablePadding>
                      <ListItemButton
                        component={Link}
                        href={item.href}
                        selected={active}
                        sx={{
                          borderRadius: 3, py: 1.25, position: 'relative',
                          '&.Mui-selected': { bgcolor: ACCENT_BG, color: ACCENT_TEXT },
                          '&.Mui-selected:hover': { bgcolor: ACCENT_BG },
                          '&:not(.Mui-selected)': { color: '#94A3B8' },
                          '&:not(.Mui-selected):hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#E2E8F0' },
                        }}
                      >
                        {active && (
                          <Box sx={{
                            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                            width: 3, height: 20, borderRadius: '0 4px 4px 0', bgcolor: ACCENT,
                          }} />
                        )}
                        <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                          <item.icon size={15} />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 500 }}
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
        <Box sx={{ px: 2.5, pb: 2.5, pt: 1.5 }}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 1.5 }} />
          <Typography sx={{ fontSize: 10, color: '#475569', textAlign: 'center' }}>
            © Katie English
          </Typography>
        </Box>
      </Box>

      {/* Main */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box component="main" sx={{ flex: 1, overflowY: 'auto' }}>
          {/* Page header */}
          <Box sx={{ px: 4, pt: 4, pb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                Teacher Portal
                <Box component="span" sx={{ opacity: 0.4, mx: 0.25 }}>›</Box>
                <Box component="span" sx={{ color: 'text.primary', opacity: 0.5, fontWeight: 500 }}>{title}</Box>
              </Typography>
              <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.75 }}>{subtitle}</Typography>
              )}
            </Box>

            {/* User avatar button */}
            <Box sx={{ position: 'relative', flexShrink: 0, mt: 0.5 }}>
              <IconButton
                onClick={handleMenuOpen}
                sx={{
                  width: 36, height: 36, borderRadius: '50%', bgcolor: ACCENT,
                  color: 'white', fontWeight: 700, fontSize: 14,
                  '&:hover': { bgcolor: ACCENT, opacity: 0.8 },
                }}
              >
                {user.upn[0].toUpperCase()}
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={showUserMenu}
                onClose={handleMenuClose}
                PaperProps={{ sx: { width: 288, borderRadius: 3, p: 1, mt: 1 } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                {/* User info row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white',
                      flexShrink: 0, bgcolor: ACCENT,
                    }}>
                      {user.upn[0].toUpperCase()}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.upn}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Teacher</Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={handleMenuClose} sx={{ color: 'text.secondary' }}>
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
                      inputProps={{ minLength: 6 }}
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
                      sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: ACCENT, opacity: 0.9 }, borderRadius: 3, fontSize: 12 }}
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
          <Box sx={{ px: 4, pb: 4 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

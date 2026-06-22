'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminAuth, AdminUser } from '@/lib/admin-auth';
import { LayoutDashboard, Users, School, GraduationCap, FileText, Receipt, Upload, LogOut } from 'lucide-react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

const SIDEBAR_BG = '#0F1B2D';
const ACCENT = '#6366F1';
const ACCENT_BG = 'rgba(99,102,241,0.15)';
const ACCENT_TEXT = '#A5B4FC';

const NAV_GROUPS = [
  {
    label: 'GENERAL',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/teachers', label: 'Teachers', icon: Users },
      { href: '/admin/classes', label: 'Classes', icon: School },
      { href: '/admin/students', label: 'Students', icon: GraduationCap },
      { href: '/admin/homework', label: 'Homework', icon: FileText },
      { href: '/admin/tuition', label: 'Tuition', icon: Receipt },
      { href: '/admin/import', label: 'Import', icon: Upload },
    ],
  },
];

interface Props {
  user: AdminUser;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AdminShell({ user, children, title, subtitle }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  function logout() { clearAdminAuth(); router.push('/admin/login'); }

  return (
    <Box sx={{ display: 'flex', height: '100vh', minWidth: 1280 }}>
      {/* Sidebar — dark navy, indigo accent */}
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
                Admin Portal
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
              <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
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
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box component="main" sx={{ flex: 1, overflowY: 'auto' }}>
          {/* Page header — HeyWord style: greeting + bold title */}
          <Box sx={{ px: '32px', pt: '28px', pb: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontSize: 12, color: '#F97316', fontWeight: 700, mb: '5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                👋 Chào {user.email?.split('@')[0] ?? 'Admin'},
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

            {/* User avatar */}
            <Box sx={{ flexShrink: 0, mt: 0.5 }}>
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                aria-label="Open account menu"
                aria-haspopup="true"
                aria-expanded={Boolean(anchorEl)}
                sx={{
                  width: 36, height: 36, bgcolor: ACCENT, color: 'white', fontSize: 14,
                  fontWeight: 700, borderRadius: '50%', '&:hover': { bgcolor: '#4F46E5' },
                }}
              >
                {(user.email?.[0] ?? '?').toUpperCase()}
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                slotProps={{ paper: { sx: { width: 288, borderRadius: 3, p: 1, mt: 1 } } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', mb: 1 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '50%', bgcolor: ACCENT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {(user.email?.[0] ?? '?').toUpperCase()}
                  </Box>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{user.email}</Typography>
                    <Typography variant="caption" color="text.secondary">Administrator</Typography>
                  </Box>
                </Box>
                <MenuItem onClick={logout} sx={{ color: 'error.main', borderRadius: 2, gap: 1 }}>
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

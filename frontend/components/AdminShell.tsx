'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminAuth, AdminUser } from '@/lib/admin-auth';
import { LayoutDashboard, Users, School, GraduationCap, FileText, LogOut } from 'lucide-react';
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

const ACCENT = '#4F9DFF';
const ACCENT_BG = 'rgba(79, 157, 255, 0.12)';
const ACCENT_TEXT = '#60A5FA';

const NAV_GROUPS = [
  {
    label: 'GENERAL',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/teachers', label: 'Teachers', icon: Users },
      { href: '/admin/classes', label: 'Classes', icon: School },
      { href: '/admin/students', label: 'Students', icon: GraduationCap },
      { href: '/admin/homework', label: 'Homework', icon: FileText },
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
      {/* Sidebar */}
      <Box sx={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', bgcolor: '#0C1220', boxShadow: '1px 0 0 rgba(255,255,255,0.05)' }}>
        {/* Logo */}
        <Box sx={{ px: 2.5, pt: 3.5, pb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: ACCENT, boxShadow: 3 }}>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 14 }}>K</Typography>
            </Box>
            <Box>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2, letterSpacing: '-0.02em' }}>Katie English</Typography>
              <Typography sx={{ color: '#475569', fontSize: 10, letterSpacing: '0.05em', mt: 0.25 }}>Admin Portal</Typography>
            </Box>
          </Box>
        </Box>

        {/* Nav */}
        <Box sx={{ flex: 1, px: 1.5, overflowY: 'auto' }}>
          {NAV_GROUPS.map((group, gi) => (
            <Box key={gi} mt={gi > 0 ? 2.5 : 0}>
              {group.label && (
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', px: 1.5, mb: 0.5, display: 'block' }}>
                  {group.label}
                </Typography>
              )}
              <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  return (
                    <ListItem key={item.href} disablePadding>
                      <ListItemButton
                        component={Link}
                        href={item.href}
                        selected={active}
                        sx={{
                          borderRadius: 3, py: 1.25,
                          '&.Mui-selected': { bgcolor: ACCENT_BG, color: ACCENT_TEXT },
                          '&.Mui-selected:hover': { bgcolor: ACCENT_BG },
                          '&:not(.Mui-selected)': { color: '#94A3B8' },
                          '&:not(.Mui-selected):hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#E2E8F0' },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                          <item.icon size={15} />
                        </ListItemIcon>
                        <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }} />
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
          <Typography variant="caption" sx={{ color: '#475569', display: 'block', textAlign: 'center' }}>
            Â© Katie English
          </Typography>
        </Box>
      </Box>

      {/* Main */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box component="main" sx={{ flex: 1, overflowY: 'auto' }}>
          {/* Page header */}
          <Box sx={{ px: 4, pt: 4, pb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                Admin Portal
                <Box component="span" sx={{ opacity: 0.4, mx: 0.25 }}>â€º</Box>
                <Box component="span" sx={{ opacity: 0.5, fontWeight: 500 }}>{title}</Box>
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1, letterSpacing: '-0.02em' }}>{title}</Typography>
              {subtitle && <Typography variant="body2" color="text.secondary" mt={0.75}>{subtitle}</Typography>}
            </Box>

            {/* User avatar */}
            <Box sx={{ flexShrink: 0, mt: 0.5 }}>
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ width: 36, height: 36, bgcolor: ACCENT, color: 'white', fontSize: 14, fontWeight: 700, borderRadius: '50%', '&:hover': { bgcolor: ACCENT, opacity: 0.8 } }}
              >
                {user.email[0].toUpperCase()}
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                slotProps={{ paper: { sx: { width: 288, borderRadius: 3, p: 1 } } }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', mb: 1 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {user.email[0].toUpperCase()}
                  </Box>
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{user.email}</Typography>
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

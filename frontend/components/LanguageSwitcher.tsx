'use client';
import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { setLocale } from '@/lib/i18n/actions';
import type { Locale } from '@/lib/i18n/request';
import { colors } from '@/lib/colors';

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
];

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  function handleOpen(event: React.MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  function handleSelect(newLocale: Locale) {
    setAnchorEl(null);
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={isPending}
        aria-label="Change language"
        aria-haspopup="true"
        aria-expanded={open}
        sx={{
          minWidth: 0,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          fontSize: 13,
          fontWeight: 700,
          color: colors.teacherAccent,
          bgcolor: colors.teacherAccentBg,
          '&:hover': { bgcolor: colors.teacherAccentBg, opacity: 0.85 },
        }}
      >
        {locale.toUpperCase()}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{ paper: { sx: { borderRadius: 2, mt: 1 } } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {LOCALES.map((loc) => (
          <MenuItem
            key={loc.code}
            selected={locale === loc.code}
            onClick={() => handleSelect(loc.code)}
            sx={{
              borderRadius: 1,
              fontSize: 14,
              '&.Mui-selected': { bgcolor: colors.teacherAccentBg, color: colors.teacherAccent },
              '&.Mui-selected:hover': { bgcolor: colors.teacherAccentBg },
            }}
          >
            {loc.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

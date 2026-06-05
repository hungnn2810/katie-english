import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  breadcrumb?: string[];
  title: string;
  subtitle?: string;
  portal: string;
}

export default function PageHeader({ breadcrumb = [], title, subtitle, portal }: PageHeaderProps) {
  const crumbs = [portal, ...breadcrumb];

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        {crumbs.map((crumb, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {index > 0 && (
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>›</Typography>
            )}
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>{crumb}</Typography>
          </Box>
        ))}
      </Box>
      <Typography
        sx={{
          fontSize: 26,
          fontWeight: 900,
          color: '#0F172A',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 14, color: '#64748B', mt: 1 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

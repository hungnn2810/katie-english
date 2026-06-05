import { Box, Card, Typography } from '@mui/material';

interface Column {
  label: string;
  width: string;
}

interface TableShellProps {
  columns: Column[];
  children: React.ReactNode;
}

interface TableRowProps {
  columns: Column[];
  cells: React.ReactNode[];
  last?: boolean;
}

export function TableRow({ columns, cells, last = false }: TableRowProps) {
  const gridTemplateColumns = columns.map((c) => c.width).join(' ');
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns,
        px: '22px',
        py: '14px',
        borderBottom: last ? 'none' : '1px solid #E2E8F0',
        alignItems: 'center',
      }}
    >
      {cells.map((cell, index) => (
        <Box key={index} sx={{ fontSize: 14 }}>
          {cell}
        </Box>
      ))}
    </Box>
  );
}

export default function TableShell({ columns, children }: TableShellProps) {
  const gridTemplateColumns = columns.map((c) => c.width).join(' ');
  return (
    <Card sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns,
          px: '22px',
          py: '12px',
          bgcolor: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        {columns.map((col, index) => (
          <Typography
            key={index}
            sx={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94A3B8',
            }}
          >
            {col.label}
          </Typography>
        ))}
      </Box>
      {children}
    </Card>
  );
}

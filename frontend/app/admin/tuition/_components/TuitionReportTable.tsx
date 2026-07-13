'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/toast-context';
import { getTuitionReport, TuitionReportItem } from '@/lib/admin-portal-api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import TableShell, { TableRow } from '@/components/ui/TableShell';

function StatusBadge({ status }: { status: 'PAID' | 'PENDING' | 'OVERDUE' }) {
  const t = useTranslations('teacher.tuition.report');
  const styles: Record<string, React.CSSProperties> = {
    PAID: { backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12, display: 'inline-block' },
    PENDING: { backgroundColor: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12, display: 'inline-block' },
    OVERDUE: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12, display: 'inline-block' },
  };
  return <span style={styles[status]}>{t(`status.${status}`)}</span>;
}

export default function TuitionReportTable({
  classId,
  month,
  year,
  onSelectionChange,
  onPaymentRecord,
  getReportFn = getTuitionReport,
}: {
  classId: number;
  month: number;
  year: number;
  onSelectionChange?: (selectedIds: number[]) => void;
  onPaymentRecord?: (recordId: number, studentName: string, totalAmount: number) => void;
  getReportFn?: (params: { classId: number; month: number; year: number; statuses?: string[] }) => Promise<TuitionReportItem[]>;
}) {
  const t = useTranslations('teacher.tuition.report');
  const { showToast } = useToast();
  const [rows, setRows] = useState<TuitionReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'OVERDUE'>('ALL');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, month, year, statusFilter]);

  async function fetchReport() {
    setLoading(true);
    try {
      const data = await getReportFn({
        classId,
        month,
        year,
        statuses: statusFilter === 'ALL' ? undefined : [statusFilter],
      });
      setRows(data);
      setSelectedIds([]);
      onSelectionChange?.([]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('toasts.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      onSelectionChange?.(next);
      return next;
    });
  }

  const selectableRows = rows.filter((r) => r.status !== 'PAID');

  function handleSelectAll() {
    if (selectedIds.length === selectableRows.length && selectableRows.length > 0) {
      setSelectedIds([]);
      onSelectionChange?.([]);
    } else {
      const allIds = selectableRows.map((r) => r.id);
      setSelectedIds(allIds);
      onSelectionChange?.(allIds);
    }
  }

  const allSelected = selectableRows.length > 0 && selectedIds.length === selectableRows.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < selectableRows.length;

  const totalCollected = rows
    .filter((r) => r.status === 'PAID')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const totalPending = rows
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const totalOverdue = rows
    .filter((r) => r.status === 'OVERDUE')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const COLUMNS = [
    { label: '', width: '0.4fr' },
    { label: t('columnStudent'), width: '1.5fr' },
    { label: t('columnTuition'), width: '1fr' },
    { label: t('columnBookFee'), width: '1fr' },
    { label: t('columnTotal'), width: '1.2fr' },
    { label: t('columnDueDate'), width: '1fr' },
    { label: t('columnStatus'), width: '0.8fr' },
    { label: t('columnPaidDate'), width: '1fr' },
    { label: '', width: '0.8fr' },
  ];

  return (
    <Box>
      {/* Filter row */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormLabel sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
          {t('statusFilterLabel')}
        </FormLabel>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE')}
          size="small"
          sx={{ minWidth: 160, borderRadius: 2 }}
        >
          <MenuItem value="ALL">{t('filterAll')}</MenuItem>
          <MenuItem value="PENDING">{t('status.PENDING')}</MenuItem>
          <MenuItem value="PAID">{t('status.PAID')}</MenuItem>
          <MenuItem value="OVERDUE">{t('status.OVERDUE')}</MenuItem>
        </Select>
        {selectableRows.length > 0 && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={allSelected}
                indeterminate={someSelected}
                onChange={handleSelectAll}
              />
            }
            label={
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                {allSelected ? t('deselectAll') : t('selectAllCount', { count: selectableRows.length })}
              </Typography>
            }
          />
        )}
      </Box>

      {/* Totals summary */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ px: 2, py: 1, borderRadius: 2, backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 600, fontSize: 13 }}>
          {t('totalCollectedLabel')} {totalCollected.toLocaleString('vi-VN')} VNĐ
        </Box>
        <Box sx={{ px: 2, py: 1, borderRadius: 2, backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600, fontSize: 13 }}>
          {t('totalPendingLabel')} {totalPending.toLocaleString('vi-VN')} VNĐ
        </Box>
        <Box sx={{ px: 2, py: 1, borderRadius: 2, backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 600, fontSize: 13 }}>
          {t('totalOverdueLabel')} {totalOverdue.toLocaleString('vi-VN')} VNĐ
        </Box>
      </Box>

      {/* Table or empty state */}
      {rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t('noDataThisMonth')}
        </Typography>
      ) : (
        <TableShell columns={COLUMNS}>
          {rows.map((row, idx) => (
            <TableRow
              key={row.id}
              columns={COLUMNS}
              last={idx === rows.length - 1}
              cells={[
                row.status !== 'PAID' ? (
                  <Checkbox
                    key="check"
                    size="small"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                  />
                ) : <span key="check" />,
                <span key="name">{row.studentName}</span>,
                <span key="tuition">{row.tuitionAmount.toLocaleString('vi-VN')} đ</span>,
                <span key="book">{row.bookFee.toLocaleString('vi-VN')} đ</span>,
                <span key="total">{row.totalAmount.toLocaleString('vi-VN')} đ</span>,
                <span key="due">{new Date(row.dueDate).toLocaleDateString('vi-VN')}</span>,
                <StatusBadge key="status" status={row.status} />,
                <span key="paid">{row.paidAt ? new Date(row.paidAt).toLocaleDateString('vi-VN') : '—'}</span>,
                row.status !== 'PAID' ? (
                  <Button
                    key="action"
                    variant="outlined"
                    size="small"
                    onClick={() => onPaymentRecord?.(row.id, row.studentName, row.totalAmount)}
                    sx={{ borderRadius: 2, fontSize: 12, whiteSpace: 'nowrap' }}
                  >
                    {t('recordPayment')}
                  </Button>
                ) : <span key="action" />,
              ]}
            />
          ))}
        </TableShell>
      )}
    </Box>
  );
}

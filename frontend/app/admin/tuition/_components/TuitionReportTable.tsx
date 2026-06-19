'use client';
import { useEffect, useState } from 'react';
import { useToast } from '@/lib/toast-context';
import { getTuitionReport, TuitionReportItem } from '@/lib/admin-portal-api';
import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormLabel from '@mui/material/FormLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import TableShell, { TableRow } from '@/components/ui/TableShell';

const COLUMNS = [
  { label: 'Học sinh', width: '1.5fr' },
  { label: 'Tiền học (VNĐ)', width: '1fr' },
  { label: 'Tiền sách (VNĐ)', width: '1fr' },
  { label: 'Tổng (VNĐ)', width: '1.2fr' },
  { label: 'Hạn đóng', width: '1fr' },
  { label: 'Trạng thái', width: '0.8fr' },
  { label: 'Ngày đóng', width: '1fr' },
];

function StatusBadge({ status }: { status: 'PAID' | 'PENDING' | 'OVERDUE' }) {
  const styles: Record<string, React.CSSProperties> = {
    PAID: { backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12, display: 'inline-block' },
    PENDING: { backgroundColor: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12, display: 'inline-block' },
    OVERDUE: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12, display: 'inline-block' },
  };
  const labels: Record<string, string> = {
    PAID: 'Đã đóng',
    PENDING: 'Chưa đóng',
    OVERDUE: 'Quá hạn',
  };
  return <span style={styles[status]}>{labels[status] ?? status}</span>;
}

export default function TuitionReportTable({
  classId,
  month,
  year,
}: {
  classId: number;
  month: number;
  year: number;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<TuitionReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'OVERDUE'>('ALL');

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, month, year, statusFilter]);

  async function fetchReport() {
    setLoading(true);
    try {
      const data = await getTuitionReport({
        classId,
        month,
        year,
        statuses: statusFilter === 'ALL' ? undefined : [statusFilter],
      });
      setRows(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Tải báo cáo thất bại', 'error');
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <Box>
      {/* Filter row */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormLabel sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
          Trạng thái
        </FormLabel>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'PAID' | 'OVERDUE')}
          size="small"
          sx={{ minWidth: 160, borderRadius: 2 }}
        >
          <MenuItem value="ALL">Tất cả</MenuItem>
          <MenuItem value="PENDING">Chưa đóng</MenuItem>
          <MenuItem value="PAID">Đã đóng</MenuItem>
          <MenuItem value="OVERDUE">Quá hạn</MenuItem>
        </Select>
      </Box>

      {/* Totals summary */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            backgroundColor: '#dcfce7',
            color: '#15803d',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Đã thu: {totalCollected.toLocaleString('vi-VN')} VNĐ
        </Box>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            backgroundColor: '#fef3c7',
            color: '#92400e',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Chưa thu: {totalPending.toLocaleString('vi-VN')} VNĐ
        </Box>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Quá hạn: {totalOverdue.toLocaleString('vi-VN')} VNĐ
        </Box>
      </Box>

      {/* Table or empty state */}
      {rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Không có dữ liệu học phí cho tháng này.
        </Typography>
      ) : (
        <TableShell columns={COLUMNS}>
          {rows.map((row, idx) => (
            <TableRow
              key={row.id}
              columns={COLUMNS}
              last={idx === rows.length - 1}
              cells={[
                <span key="name">{row.studentName}</span>,
                <span key="tuition">{row.tuitionAmount.toLocaleString('vi-VN')} đ</span>,
                <span key="book">{row.bookFee.toLocaleString('vi-VN')} đ</span>,
                <span key="total">{row.totalAmount.toLocaleString('vi-VN')} đ</span>,
                <span key="due">{new Date(row.dueDate).toLocaleDateString('vi-VN')}</span>,
                <StatusBadge key="status" status={row.status} />,
                <span key="paid">{row.paidAt ? new Date(row.paidAt).toLocaleDateString('vi-VN') : '—'}</span>,
              ]}
            />
          ))}
        </TableShell>
      )}
    </Box>
  );
}

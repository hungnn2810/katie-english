'use client';
import { useCallback, useEffect, useState } from 'react';
import { getAdminClasses, AdminClassItem } from '@/lib/admin-portal-api';
import { useToast } from '@/lib/toast-context';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import FormLabel from '@mui/material/FormLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TuitionConfigForm from './_components/TuitionConfigForm';
import GenerateRecordsModal from './_components/GenerateRecordsModal';
import ZaloSendModal from './_components/ZaloSendModal';

export default function AdminTuitionPage() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<AdminClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [generateOpen, setGenerateOpen] = useState(false);
  const [zaloOpen, setZaloOpen] = useState(false);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminClasses();
      setClasses(data);
      if (data.length > 0) setSelectedClassId(data[0].id);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Tải danh sách lớp thất bại', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  const classId = typeof selectedClassId === 'number' ? selectedClassId : 0;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        Quản lý học phí
      </Typography>

      {/* Class selector */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormLabel sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', minWidth: 60 }}>
          Lớp học
        </FormLabel>
        <Select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value as number)}
          size="small"
          sx={{ minWidth: 240, borderRadius: 2 }}
          displayEmpty
        >
          {classes.length === 0 && (
            <MenuItem value="" disabled>Không có lớp nào</MenuItem>
          )}
          {classes.map((cls) => (
            <MenuItem key={cls.id} value={cls.id}>
              {cls.name} ({cls.code})
            </MenuItem>
          ))}
        </Select>
      </Box>

      {classId === 0 ? (
        <Typography color="text.secondary">Chọn một lớp để quản lý học phí.</Typography>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
          >
            <Tab label="Cấu hình" />
            <Tab label="Tạo phiếu thu" />
            <Tab label="Thông báo ZNS" />
            <Tab label="Báo cáo" />
          </Tabs>

          <CardContent sx={{ p: 3 }}>
            {activeTab === 0 && (
              <TuitionConfigForm
                classId={classId}
                onClose={() => {}}
                onSaved={() => {}}
              />
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Tạo phiếu thu học phí cho tất cả học sinh trong lớp theo tháng.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setGenerateOpen(true)}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Tạo phiếu thu tháng này
                </Button>
                <GenerateRecordsModal
                  open={generateOpen}
                  classId={classId}
                  onClose={() => setGenerateOpen(false)}
                  onSaved={() => {}}
                />
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Chọn học sinh từ tab Báo cáo để gửi ZNS. Hiện tại, nhấn nút bên dưới để gửi thông báo cho tất cả phiếu thu chưa đóng.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setZaloOpen(true)}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Gửi thông báo ZNS
                </Button>
                <ZaloSendModal
                  open={zaloOpen}
                  recordIds={[]}
                  onClose={() => setZaloOpen(false)}
                  onSent={() => {}}
                />
              </Box>
            )}

            {activeTab === 3 && (
              <Typography color="text.secondary">
                Báo cáo học phí — xem tại tab Báo cáo (Plan 04).
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

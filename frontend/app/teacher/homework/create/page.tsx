'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { ChevronLeft, Hash, Mic, ImageIcon, Headphones, Plus, X, Check } from 'lucide-react';

const HW_TYPES = [
  { type: 'PHONICS',    label: 'Phonics',    icon: Hash,       color: '#F97316', route: null },
  { type: 'SPEAKING',   label: 'Speaking',   icon: Mic,        color: '#EC4899', route: null },
  { type: 'VOCABULARY', label: 'Vocabulary', icon: ImageIcon,  color: '#8B5CF6', route: '/teacher/homework/create/vocabulary' },
  { type: 'LISTEN',     label: 'Listen',     icon: Headphones, color: '#06B6D4', route: '/teacher/homework/create/listen' },
] as const;

type HwType = typeof HW_TYPES[number]['type'];

export default function CreateHomeworkPage() {
  const router = useRouter();
  const [picked, setPicked] = useState<HwType>('PHONICS');
  const [words, setWords] = useState<string[]>(['cat', 'dog', 'ship']);
  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const [assignTo, setAssignTo] = useState('');

  const pickedMeta = HW_TYPES.find((t) => t.type === picked)!;

  function addWord(e: React.FormEvent) {
    e.preventDefault();
    const w = draft.trim();
    if (!w) return;
    setWords((prev) => [...prev, w]);
    setDraft('');
  }

  function removeWord(idx: number) {
    setWords((prev) => prev.filter((_, i) => i !== idx));
  }

  function handlePublish() {
    // For types with dedicated creation flows, navigate there
    if (pickedMeta.route) {
      router.push(pickedMeta.route);
      return;
    }
    // PHONICS and SPEAKING use the modal on the homework list page
    router.push('/teacher/homework');
  }

  return (
    <Box sx={{ maxWidth: 720 }}>
      {/* Back link */}
      <Button
        variant="text"
        onClick={() => router.push('/teacher/homework')}
        sx={{ mb: '14px', pl: 0, color: '#64748B', fontSize: 13, fontWeight: 600, gap: 0.5 }}
      >
        <ChevronLeft size={16} />
        Back to Homework
      </Button>

      {/* Step 1 label */}
      <Typography sx={{ mb: '12px', fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        1 · Choose type
      </Typography>

      {/* Type selector grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', mb: '26px' }}>
        {HW_TYPES.map((t) => {
          const Icon = t.icon;
          const selected = picked === t.type;
          return (
            <Box
              key={t.type}
              onClick={() => setPicked(t.type)}
              sx={{
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                bgcolor: 'white',
                border: `2px solid ${selected ? t.color : '#E2E8F0'}`,
                boxShadow: selected ? `0 4px 12px ${t.color}33` : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                '&:hover': {
                  borderColor: selected ? t.color : '#CBD5E1',
                },
              }}
            >
              <Box sx={{
                width: 44, height: 44, mx: 'auto', mb: '10px',
                borderRadius: '12px', bgcolor: t.color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} color={t.color} />
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize', color: '#0F172A' }}>
                {t.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Step 2 label */}
      <Typography sx={{ mb: '12px', fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        2 · Build word list
      </Typography>

      {/* Details card */}
      <Card sx={{ p: '22px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        {/* Title + Assign to */}
        <Box sx={{ display: 'flex', gap: '16px', mb: '18px' }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Assign to"
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            size="small"
            sx={{ width: 160 }}
          />
        </Box>

        {/* Word chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', mb: '16px' }}>
          {words.map((w, i) => (
            <Box
              key={i}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                px: '12px', py: '8px', borderRadius: '10px',
                bgcolor: '#FFF7ED', color: '#F97316', fontWeight: 700, fontSize: 14,
              }}
            >
              {w}
              <IconButton
                size="small"
                onClick={() => removeWord(i)}
                sx={{ color: '#F97316', width: 18, height: 18, p: 0 }}
              >
                <X size={13} />
              </IconButton>
            </Box>
          ))}
        </Box>

        {/* Add word form */}
        <Box component="form" onSubmit={addWord} sx={{ display: 'flex', gap: '10px' }}>
          <TextField
            label="Add a word"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="type a word and press Add"
            size="small"
            sx={{ flex: 1 }}
          />
          <Button type="submit" variant="contained"
            sx={{ bgcolor: '#3B82F6', '&:hover': { bgcolor: '#3B82F6', opacity: 0.9 }, borderRadius: '8px', gap: 0.5, flexShrink: 0 }}>
            <Plus size={16} />
            Add
          </Button>
        </Box>
      </Card>

      {/* Footer actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', mt: '20px' }}>
        <Button variant="outlined" onClick={() => router.push('/teacher/homework')}
          sx={{ borderRadius: '8px', color: '#64748B', borderColor: '#E2E8F0' }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handlePublish}
          sx={{ bgcolor: '#3B82F6', '&:hover': { bgcolor: '#3B82F6', opacity: 0.9 }, borderRadius: '8px', gap: 0.5 }}>
          <Check size={16} />
          Publish homework
        </Button>
      </Box>
    </Box>
  );
}

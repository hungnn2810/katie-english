'use client';
import { useRef, useState } from 'react';
import { uploadImportFile, downloadTemplate, isImportError, ImportResponse } from '@/lib/import-api';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { Download, Upload } from 'lucide-react';

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await uploadImportFile(file, 'admin');
      setResult(response);
      setFile(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      {/* Intro card */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Bulk Import
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Download the template, fill in your data, and upload.
        </Typography>
      </Paper>

      {/* Actions card */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Download Template */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Step 1 — Download the template
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Download size={16} />}
              onClick={() => downloadTemplate('admin').catch((e: Error) => setError(e.message))}
            >
              Download Template
            </Button>
          </Box>

          {/* File upload */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Step 2 — Fill in and upload the file
            </Typography>
            <input
              type="file"
              accept=".xlsx"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose File (.xlsx)
            </Button>
            {file && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Selected: {file.name}
              </Typography>
            )}
          </Box>

          {/* Upload button */}
          <Box>
            <Button
              variant="contained"
              disabled={!file || loading}
              startIcon={loading ? <CircularProgress size={14} /> : <Upload size={16} />}
              onClick={handleUpload}
              sx={{ bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' } }}
            >
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Result display */}
      {result && (
        <Box sx={{ mb: 3 }}>
          {isImportError(result) ? (
            <>
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                <strong>Import Failed — Fix Errors and Re-upload</strong>
              </Alert>
              <Paper sx={{ borderRadius: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Sheet</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Row</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Column</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Error Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.errors.map((err, i) => (
                      <TableRow key={i}>
                        <TableCell>{err.sheet}</TableCell>
                        <TableCell>{err.row}</TableCell>
                        <TableCell>{err.column}</TableCell>
                        <TableCell>{err.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </>
          ) : (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Import successful!
              </Typography>
              <Typography variant="body2">
                {result.imported.classes} classes, {result.imported.students} students,{' '}
                {result.imported.homework} homework items imported.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* Error fallback */}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

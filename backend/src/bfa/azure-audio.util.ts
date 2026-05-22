import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, readFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);

export async function toWavPcm(audioBuffer: Buffer, mimeType: string): Promise<Buffer> {
  const ext = mimeType.includes('webm') ? 'webm'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('aac') ? 'aac'
    : mimeType.includes('wav') ? 'wav'
    : 'webm';

  const id = randomUUID();
  const inPath = join(tmpdir(), `az-${id}.${ext}`);
  const outPath = join(tmpdir(), `az-${id}.wav`);
  try {
    await writeFile(inPath, audioBuffer);
    await execFileAsync('ffmpeg', [
      '-y', '-i', inPath,
      '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
      '-f', 'wav', outPath,
    ]);
    return await readFile(outPath);
  } finally {
    await unlink(inPath).catch(() => {});
    await unlink(outPath).catch(() => {});
  }
}

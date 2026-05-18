'use client';
import { useParams } from 'next/navigation';
import { ReadingCreationPage } from '../../_components/ReadingCreationPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  const editId = Number(params.id);
  if (!Number.isFinite(editId) || editId <= 0) return null;
  return <ReadingCreationPage editId={editId} />;
}

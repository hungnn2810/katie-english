'use client';
import { useParams } from 'next/navigation';
import { VocabCreationPage } from '../../../_components/VocabCreationPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  const editId = Number(params.id);
  if (!Number.isFinite(editId) || editId <= 0) return null;
  return <VocabCreationPage editId={editId} />;
}

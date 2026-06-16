'use client';
import { useParams } from 'next/navigation';
import { ListenCreationPage } from '../../../_components/ListenCreationPage';

export default function Page() {
  const params = useParams<{ id: string }>();
  const editId = Number(params.id);
  if (!Number.isFinite(editId) || editId <= 0) return null;
  return <ListenCreationPage editId={editId} />;
}

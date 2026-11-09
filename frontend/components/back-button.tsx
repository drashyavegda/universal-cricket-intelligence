'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ label = 'Go back' }: { label?: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className="btn-ghost btn-xs">
      <ArrowLeft size={12} /> {label}
    </button>
  );
}

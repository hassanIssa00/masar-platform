'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReportDetailsRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    router.replace(`/reports?report=${params.id}`, { scroll: true });
  }, [params.id, router]);

  return <div className="min-h-screen bg-[var(--background)]" />;
}

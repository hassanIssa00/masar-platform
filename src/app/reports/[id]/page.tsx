'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReportDetailsRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/reports?report=${params.id}`);
  }, [params.id, router]);

  return <div className="min-h-screen bg-[var(--background)]" />;
}

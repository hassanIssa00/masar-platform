import type { Metadata } from 'next';
import ArchivePage from '@/components/archive/ArchivePage';

export const metadata: Metadata = {
  title: 'الأرشيف الشامل — مسار',
  description: 'أرشيف كامل لكل بيانات المنصة — طلاب، تقارير، حسابات، بصمات الوجه، رسائل، وكل شيء',
};

export default function ArchiveRoute() {
  return <ArchivePage />;
}

import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getAuthUser();
  if (user) {
    if (user.role === 'admin') redirect('/admin/dashboard');
    if (user.role === 'supervisor') redirect('/supervisor/reports');
    redirect('/security/dashboard');
  }
  redirect('/login');
}


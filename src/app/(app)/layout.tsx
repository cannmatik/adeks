import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppLayout from '@/components/AppLayout';

export default async function GroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <AppLayout>{children}</AppLayout>;
}

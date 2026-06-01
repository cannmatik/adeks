import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppLayout from '@/components/AppLayout';
import { CategoryProvider } from '@/components/CategoryProvider';

export default async function GroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  return (
    <CategoryProvider initialCategories={categories ?? []}>
      <AppLayout>{children}</AppLayout>
    </CategoryProvider>
  );
}

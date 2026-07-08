import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: settings, error } = await supabase
      .from('cafe_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (!settings) {
      // If not found, return default
      return NextResponse.json({
        id: 'default',
        login_text: 'Çalışma Saatleri: 07:30 - 02:00',
        footer_text: 'Adeks İnternet Kafe Online Rezervasyon',
        open_time: '07:30',
        close_time: '02:00'
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Settings GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { login_text, footer_text, open_time, close_time } = body;

    const { data: updated, error } = await supabase
      .from('cafe_settings')
      .upsert({
        id: 'default',
        login_text: login_text ?? 'Çalışma Saatleri: 07:30 - 02:00',
        footer_text: footer_text ?? 'Adeks İnternet Kafe Online Rezervasyon',
        open_time: open_time ?? '07:30',
        close_time: close_time ?? '02:00',
      })
      .select()
      .single();
      
    if (error) throw error;

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Settings PUT Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

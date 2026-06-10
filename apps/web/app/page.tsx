import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/auth';

export default function HomePage(): never {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME);

  if (token) {
    redirect('/finance');
  }

  redirect('/login');
}

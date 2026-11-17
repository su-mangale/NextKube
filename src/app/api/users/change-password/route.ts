import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/server/jwt';
import { changeUserPassword } from '@/server/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await verifySessionToken(token);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are both required.' }, { status: 400 });
    }

    const result = await changeUserPassword(currentUser.username, currentPassword, newPassword);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update password.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}

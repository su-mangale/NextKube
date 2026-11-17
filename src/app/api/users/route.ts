import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/server/jwt';
import { getAllUsersSanitized, createNewUser } from '@/server/auth';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await verifySessionToken(token);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = getAllUsersSanitized();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await verifySessionToken(token);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can create new users.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = await createNewUser(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to create user.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}

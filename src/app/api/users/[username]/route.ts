import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/server/jwt';
import { deleteUser, updateUserCredentials } from '@/server/auth';

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ username: string }> }
) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await verifySessionToken(token);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can delete users.' }, { status: 403 });
  }

  const { username } = await props.params;
  const decodedUsername = decodeURIComponent(username);

  const result = await deleteUser(decodedUsername, currentUser.username);

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Failed to delete user.' }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: `User "${decodedUsername}" deleted.` });
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ username: string }> }
) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = await verifySessionToken(token);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username } = await props.params;
  const decodedUsername = decodeURIComponent(username);

  // Allow admin to update any user, or allow a non-admin user to update their own credentials
  if (currentUser.role !== 'admin' && currentUser.username.toLowerCase() !== decodedUsername.toLowerCase()) {
    return NextResponse.json({ error: 'Only administrators can modify other user accounts.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = await updateUserCredentials(decodedUsername, body, currentUser);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update user.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process update.' }, { status: 500 });
  }
}


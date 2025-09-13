import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Discord OAuth not configured' }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    scope: 'identify',
    redirect_uri: redirectUri,
    prompt: 'consent',
  });

  const authorizeUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
  return NextResponse.redirect(authorizeUrl);
}

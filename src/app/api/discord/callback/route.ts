import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  if (error) {
    return NextResponse.redirect(new URL(`/discord/linked?status=error&reason=${encodeURIComponent(error)}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/discord/linked?status=error&reason=missing_code', req.url));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/discord/linked?status=error&reason=server_config', req.url));
  }

  interface DiscordTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    refresh_token?: string;
  }

  interface DiscordUser {
    id: string;
    username: string;
    discriminator?: string;
    global_name?: string;
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return NextResponse.redirect(new URL(`/discord/linked?status=error&reason=token_exchange&detail=${encodeURIComponent(text)}`, req.url));
    }
    const tokenJson: DiscordTokenResponse = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    // Fetch user profile
    const meRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!meRes.ok) {
      const text = await meRes.text();
      return NextResponse.redirect(new URL(`/discord/linked?status=error&reason=fetch_me&detail=${encodeURIComponent(text)}`, req.url));
    }
    const me: DiscordUser = await meRes.json();
    const discordId = me.id;
    const username = me.username;
    const discriminator = me.discriminator;

    // Redirect to client page to complete linking using Firebase token
    const url = new URL('/discord/linked', req.url);
    url.searchParams.set('status', 'ok');
    url.searchParams.set('discordId', discordId);
    if (username) url.searchParams.set('username', username);
    if (discriminator) url.searchParams.set('disc', discriminator);
    return NextResponse.redirect(url);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.redirect(new URL(`/discord/linked?status=error&reason=exception&detail=${encodeURIComponent(message)}`, req.url));
  }
}

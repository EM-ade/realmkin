import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Get Firebase token from cookies or query params
  const firebaseToken = req.cookies.get("firebase_token")?.value || req.nextUrl.searchParams.get("token") || "";
  
  // Optional state passthrough (e.g., return path)
  const state = req.nextUrl.searchParams.get("state") || "";

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error("[discord:login] Missing NEXT_PUBLIC_DISCORD_CLIENT_ID or NEXT_PUBLIC_DISCORD_REDIRECT_URI");
    return NextResponse.redirect(new URL("/discord/linked?status=error&reason=server_config", req.url));
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "identify",
    redirect_uri: redirectUri,
  });
  if (state) params.set("state", state);
  if (firebaseToken) params.set("firebase_token", firebaseToken);

  const authorizeUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
  console.log("[discord:login] Redirecting to Discord authorize:", authorizeUrl);
  return NextResponse.redirect(authorizeUrl);
}

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: false, message: "Waitlist is disabled" }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ ok: false, message: "Waitlist is disabled" }, { status: 410 });
}

export async function PUT() {
  return NextResponse.json({ ok: false, message: "Waitlist is disabled" }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, message: "Waitlist is disabled" }, { status: 410 });
}

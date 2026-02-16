import { NextResponse } from "next/server";

const ADMIN_HEADER = "x-admin-passcode";

export function requireAdmin(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_PASSCODE;

  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_PASSCODE is missing" },
      { status: 500 },
    );
  }

  const provided = request.headers.get(ADMIN_HEADER);

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

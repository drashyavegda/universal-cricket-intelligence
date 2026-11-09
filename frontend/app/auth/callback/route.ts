import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");

  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  if (code) {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL(safeNext, url.origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", url.origin)
  );
}
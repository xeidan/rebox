import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      ),
    };
  }

  if (data.user.app_metadata?.role !== "admin") {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return { user: data.user, response: null };
}

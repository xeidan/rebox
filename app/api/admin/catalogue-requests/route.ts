import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rebox/require-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);

  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const allowedStatuses = ["pending", "reviewed", "added", "rejected"];

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Invalid request status" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("device_catalogue_requests")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Catalogue requests fetch failed:", error);

    return NextResponse.json(
      { error: "Unable to retrieve catalogue requests" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    requests: data,
    count: data.length,
  });
}


import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function reconcileDevice(
  brand: string,
  model: string
) {
  const safeBrand = escapeLikePattern(brand.trim());
  const safeModel = escapeLikePattern(model.trim());

  const { data, error } = await supabaseAdmin
    .from("devices")
    .select(`
      id,
      brand,
      model,
      model_number,
      category,
      release_year,
      specifications
    `)
    .ilike("brand", safeBrand)
    .ilike("model", safeModel)
    .limit(2);

  if (error) {
    console.error("Catalogue reconciliation failed.");
    throw new Error("Catalogue reconciliation failed");
  }

  if (!data?.length) {
    return { status: "unmatched", device: null };
  }

  if (data.length > 1) {
    return { status: "ambiguous", device: null };
  }

  return {
    status: "matched",
    device: data[0],
  };
}

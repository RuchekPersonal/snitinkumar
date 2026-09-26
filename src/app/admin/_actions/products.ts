"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  deleteProductImage,
  ProductInput,
  reorderProductImages,
  saveProduct,
  setVisibility,
} from "@/lib/server/admin/products";

export type SaveResult =
  { ok: true; id: string; code: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveProductAction(input: unknown, id?: string): Promise<SaveResult> {
  const parsed = ProductInput.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }
  if (id !== undefined && !z.uuid().safeParse(id).success) return { ok: false, error: "Invalid product" };
  try {
    const saved = await saveProduct(parsed.data, id);
    return { ok: true, ...saved };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function setVisibilityAction(id: string, visible: boolean) {
  await setVisibility(z.uuid().parse(id), visible);
  refresh();
}

export async function deleteImageAction(productId: string, imageId: string) {
  await deleteProductImage(z.uuid().parse(productId), z.uuid().parse(imageId));
}

export async function reorderImagesAction(productId: string, ids: string[]) {
  await reorderProductImages(z.uuid().parse(productId), z.array(z.uuid()).max(20).parse(ids));
}

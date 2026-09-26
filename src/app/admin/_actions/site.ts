"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { HomeHero } from "@/lib/home-content";
import { removeCategoryCover, removeHeroImage, resetHomeHero, saveHomeHero } from "@/lib/server/admin/site";

type Result = { ok: true } | { ok: false; error: string };

export async function saveHomeHeroAction(input: unknown): Promise<Result> {
  const parsed = HomeHero.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await saveHomeHero(parsed.data);
  refresh();
  return { ok: true };
}

export async function resetHomeHeroAction(): Promise<Result> {
  await resetHomeHero();
  refresh();
  return { ok: true };
}

export async function removeHeroImageAction(position: number): Promise<Result> {
  await removeHeroImage(z.number().int().min(0).max(4).parse(position));
  refresh();
  return { ok: true };
}

export async function removeCategoryCoverAction(categoryId: number): Promise<Result> {
  await removeCategoryCover(z.number().int().positive().parse(categoryId));
  refresh();
  return { ok: true };
}

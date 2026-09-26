"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  addAttribute,
  CategoryInput,
  deleteAttribute,
  moveAttribute,
  moveCategory,
  saveCategory,
  setColourHex,
} from "@/lib/server/admin/categories";

type Result = { ok: true } | { ok: false; error: string };
const Table = z.enum(["fabrics", "colours", "sizes"]);
const Dir = z.union([z.literal(-1), z.literal(1)]);

async function run(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function saveCategoryAction(input: unknown, id?: number): Promise<Result> {
  const parsed = CategoryInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (id !== undefined && !Number.isInteger(id)) return { ok: false, error: "Invalid category" };
  return run(() => saveCategory(parsed.data, id));
}

export async function moveCategoryAction(id: number, dir: number): Promise<Result> {
  return run(() => moveCategory(z.number().int().parse(id), Dir.parse(dir)));
}

export async function addAttributeAction(table: string, value: string, hex?: string): Promise<Result> {
  return run(() => addAttribute(Table.parse(table), String(value), hex ? String(hex) : undefined));
}

export async function setColourHexAction(id: number, hex: string): Promise<Result> {
  return run(() => setColourHex(z.number().int().parse(id), String(hex)));
}

export async function deleteAttributeAction(table: string, id: number): Promise<Result> {
  return run(() => deleteAttribute(Table.parse(table), z.number().int().parse(id)));
}

export async function moveAttributeAction(table: string, id: number, dir: number): Promise<Result> {
  return run(() => moveAttribute(Table.parse(table), z.number().int().parse(id), Dir.parse(dir)));
}

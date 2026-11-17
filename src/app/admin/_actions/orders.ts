"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import {
  cancelOrder,
  createOrder,
  createTrip,
  DispatchInput,
  markDispatched,
  OrderInput,
  reopenOrder,
  type Trip,
} from "@/lib/server/admin/orders";
import { addRetailer, RetailerInput } from "@/lib/server/admin/customers";

type Result = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createOrderAction(
  input: unknown,
): Promise<{ ok: true; ref: string } | { ok: false; error: string }> {
  const parsed = OrderInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    return { ok: true, ...(await createOrder(parsed.data)) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createTripAction(name: string): Promise<{ ok: true; trip: Trip } | { ok: false; error: string }> {
  try {
    return { ok: true, trip: await createTrip(String(name)) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Quick-add from the order form; the new customer is approved straight away. */
export async function addOrderCustomerAction(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = RetailerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    return { ok: true, id: (await addRetailer(parsed.data)).id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function markDispatchedAction(id: string, input: unknown): Promise<Result> {
  const parsed = DispatchInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(() => markDispatched(z.uuid().parse(id), parsed.data));
}

export async function cancelOrderAction(id: string, reason: string): Promise<Result> {
  return run(() => cancelOrder(z.uuid().parse(id), z.string().trim().max(300).parse(reason)));
}

export async function reopenOrderAction(id: string): Promise<Result> {
  return run(() => reopenOrder(z.uuid().parse(id)));
}

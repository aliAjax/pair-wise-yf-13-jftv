/**
 * 校验模块：舱容截弃、总量比对与签收条件。
 * 纯函数，不依赖存储与界面。
 */

import type { BunkerRecord, TankEntry } from "./supply";

/** 计量单总重与各舱入账增量的允许偏差（%） */
export const TOL_PCT = 1;

export type RecordStatus = "draft" | "pending" | "ready" | "signed";

export const STATUS_LABEL: Record<RecordStatus, string> = {
  draft: "待完善",
  pending: "待处理",
  ready: "待签收",
  signed: "已签收",
};

export interface TankCalc {
  measured: number | null; // 实测增量 = 结束存量 - 开始存量
  booked: number | null; // 入账增量 = 实测增量按舱容上限截弃后的部分
  clipped: number; // 超出舱容、不予入账的部分
  problems: string[];
}

export interface Summary {
  calcs: TankCalc[];
  planTotal: number; // 各舱计划量合计
  bookedTotal: number; // 各舱入账增量合计
  clippedTotal: number; // 各舱超舱容截弃合计
  noteTotal: number | null; // 计量单总重量
  diff: number | null; // 入账合计 - 计量单总重
  pct: number | null; // |差值| / 计量单总重 × 100
  complete: boolean; // 数据是否填齐
  overTol: boolean; // 偏差是否超过允许值
  status: RecordStatus;
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000;

export function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 单舱计算：超出舱容上限的部分不许入账 */
export function tankCalc(t: TankEntry): TankCalc {
  const start = toNum(t.start);
  const end = toNum(t.end);
  const cap = toNum(t.cap);
  const problems: string[] = [];

  if (start === null || end === null) {
    return { measured: null, booked: null, clipped: 0, problems: ["存量未填完整"] };
  }
  if (start < 0 || end < 0) problems.push("存量不能为负");

  const measured = r3(end - start);
  if (measured < 0) problems.push("结束存量小于开始存量");

  if (cap === null) {
    problems.push("未设舱容上限");
    return { measured, booked: Math.max(0, measured), clipped: 0, problems };
  }
  if (cap <= 0) problems.push("舱容上限须大于 0");

  const headroom = Math.max(0, cap - Math.max(0, start));
  const booked = r3(Math.min(Math.max(0, measured), headroom));
  const clipped = r3(Math.max(0, measured) - booked);
  if (clipped > 0) problems.push(`超出舱容 ${clipped.toFixed(3)} t，未入账`);

  return { measured, booked, clipped, problems };
}

/** 整单汇总与状态判定 */
export function summarize(rec: BunkerRecord): Summary {
  const calcs = rec.tanks.map(tankCalc);
  const planTotal = r3(rec.tanks.reduce((s, t) => s + (toNum(t.plan) ?? 0), 0));
  const bookedTotal = r3(calcs.reduce((s, c) => s + (c.booked ?? 0), 0));
  const clippedTotal = r3(calcs.reduce((s, c) => s + c.clipped, 0));
  const noteTotal = toNum(rec.noteTotal);
  const diff = noteTotal === null ? null : r3(bookedTotal - noteTotal);
  const pct = noteTotal && diff !== null ? r3((Math.abs(diff) / noteTotal) * 100) : null;

  const complete =
    noteTotal !== null &&
    rec.tanks.length > 0 &&
    calcs.every((c) => c.measured !== null && c.measured >= 0);
  const overTol = pct !== null && pct > TOL_PCT;

  let status: RecordStatus = "draft";
  if (rec.signedAt) status = "signed";
  else if (complete) status = overTol ? "pending" : "ready";

  return { calcs, planTotal, bookedTotal, clippedTotal, noteTotal, diff, pct, complete, overTol, status };
}

/** 签收前仍需解决的问题；为空数组才允许签收 */
export function signBlockers(rec: BunkerRecord, sum: Summary): string[] {
  const out: string[] = [];
  if (sum.status === "signed") out.push("单据已签收");
  if (!sum.complete) out.push("各舱存量或计量单总重未填完整");
  if (sum.overTol && !rec.handler.trim()) out.push(`偏差超过 ${TOL_PCT}%，停在待处理，须写明处理人`);
  if (!rec.signer.trim()) out.push("须填写签收人");
  return out;
}

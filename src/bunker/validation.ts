/**
 * 校验逻辑：舱增量计算、超容扣减、差率判定、签收条件。
 * 纯函数，不依赖界面与存储。
 */
import {
  BunkerRecord,
  BunkerStatus,
  DISCREPANCY_LIMIT,
  TankEntry,
} from "./types";

/** 非法数值（空/负/非数字）在计算中按 0 处理，错误另行提示 */
const sane = (v: number): number => (Number.isFinite(v) && v >= 0 ? v : 0);

export interface TankCalc {
  measured: number; // 实测增量 = 结束存量 - 开始存量
  counted: number; // 入账增量，超出舱容上限的部分不计
  overflow: number; // 超出舱容、未入账的部分
  errors: string[];
}

export function calcTank(tank: TankEntry): TankCalc {
  const errors: string[] = [];
  const fields: Array<[string, number]> = [
    ["计划量", tank.planned],
    ["开始存量", tank.startQty],
    ["结束存量", tank.endQty],
    ["舱容上限", tank.capacity],
  ];
  for (const [label, v] of fields) {
    if (!Number.isFinite(v) || v < 0) errors.push(`${label}需填写非负数字`);
  }
  if (Number.isFinite(tank.capacity) && tank.capacity <= 0) {
    errors.push("舱容上限必须大于0");
  }
  if (
    Number.isFinite(tank.startQty) &&
    Number.isFinite(tank.endQty) &&
    tank.endQty < tank.startQty
  ) {
    errors.push("结束存量不能小于开始存量");
  }
  if (
    Number.isFinite(tank.startQty) &&
    Number.isFinite(tank.capacity) &&
    tank.startQty > tank.capacity
  ) {
    errors.push("开始存量超过舱容上限");
  }

  const start = sane(tank.startQty);
  const end = sane(tank.endQty);
  const cap = sane(tank.capacity);
  return {
    measured: Math.max(0, end - start),
    counted: Math.max(0, Math.min(end, cap) - start),
    overflow: Math.max(0, end - cap),
    errors,
  };
}

/** 各舱入账增量合计 */
export function sumCounted(tanks: TankEntry[]): number {
  return tanks.reduce((acc, t) => acc + calcTank(t).counted, 0);
}

/** 各舱计划量合计 */
export function sumPlanned(tanks: TankEntry[]): number {
  return tanks.reduce((acc, t) => acc + sane(t.planned), 0);
}

export interface Discrepancy {
  diff: number; // 计量单总重量 - 入账合计（正数表示少收）
  ratio: number; // |diff| / 计量单总重量
  overLimit: boolean; // 差率是否超过 1%
}

export function checkDiscrepancy(
  noteTotal: number,
  countedTotal: number
): Discrepancy {
  const diff = noteTotal - countedTotal;
  const ratio = noteTotal > 0 ? Math.abs(diff) / noteTotal : 0;
  return {
    diff,
    ratio,
    overLimit: noteTotal > 0 && ratio > DISCREPANCY_LIMIT,
  };
}

/** 单据登记完整性校验，返回错误列表（空数组表示可保存） */
export function recordErrors(record: BunkerRecord): string[] {
  const errors: string[] = [];
  if (!record.supplierShip.trim()) errors.push("未登记供应船");
  if (!record.oilType.trim()) errors.push("未选择油品");
  if (!record.sealNo.trim()) errors.push("未填写封签号");
  if (!(record.noteTotal > 0)) errors.push("计量单总重量必须大于0");
  if (record.tanks.length === 0) errors.push("至少填写一个受油舱");
  record.tanks.forEach((t, i) => {
    const name = t.tankName.trim() || `第${i + 1}舱`;
    if (!t.tankName.trim()) errors.push(`${name}未填写舱名`);
    calcTank(t).errors.forEach((e) => errors.push(`${name}：${e}`));
  });
  return errors;
}

export function recordStatus(record: BunkerRecord): BunkerStatus {
  if (record.signedAt) return "signed";
  const { overLimit } = checkDiscrepancy(
    record.noteTotal,
    sumCounted(record.tanks)
  );
  return overLimit ? "pending" : "ready";
}

/** 签收条件：登记完整、填写签收人；差率超 1% 时必须先写明处理人 */
export function canSign(record: BunkerRecord): {
  ok: boolean;
  reason: string | null;
} {
  if (record.signedAt) return { ok: false, reason: "单据已签收" };
  const errors = recordErrors(record);
  if (errors.length > 0) return { ok: false, reason: errors[0] };
  if (!record.signedBy.trim()) return { ok: false, reason: "请填写签收人" };
  if (recordStatus(record) === "pending" && !record.handler.trim()) {
    return { ok: false, reason: "差率超过1%，需写明处理人后方可签收" };
  }
  return { ok: true, reason: null };
}

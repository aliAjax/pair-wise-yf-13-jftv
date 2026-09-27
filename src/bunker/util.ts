import { BunkerStatus } from "./types";

/** 生成单据/舱行 id（不依赖安全上下文，http 下也可用） */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 吨数保留三位小数，非法值显示占位符 */
export function fmtQty(n: number): string {
  return Number.isFinite(n) ? n.toFixed(3) : "—";
}

export function fmtPct(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("zh-CN", { hour12: false });
}

export const STATUS_META: Record<
  BunkerStatus,
  { label: string; className: string }
> = {
  pending: { label: "待处理", className: "badge badge-pending" },
  ready: { label: "待签收", className: "badge badge-ready" },
  signed: { label: "已签收", className: "badge badge-signed" },
};

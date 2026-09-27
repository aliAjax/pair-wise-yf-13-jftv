/** 受油舱明细：计划量与前后实测存量，单位均为吨 */
export interface TankEntry {
  id: string;
  tankName: string;
  planned: number; // 计划量
  startQty: number; // 开始存量
  endQty: number; // 结束存量
  capacity: number; // 舱容上限
}

/** 燃油加装验收单据 */
export interface BunkerRecord {
  id: string;
  createdAt: string; // ISO 时间
  supplierShip: string; // 供应船
  oilType: string; // 油品
  sealNo: string; // 封签号
  noteTotal: number; // 供油船计量单总重量(t)
  tanks: TankEntry[];
  handler: string; // 处理人（差率超限时签收前必填）
  signedBy: string; // 签收人
  signedAt: string | null; // 签收时间，null 表示未签收
}

/** pending=待处理(差率>1%) ready=待签收 signed=已签收 */
export type BunkerStatus = "pending" | "ready" | "signed";

/** 计量单总重量与各舱入账增量允许的差率阈值：1% */
export const DISCREPANCY_LIMIT = 0.01;

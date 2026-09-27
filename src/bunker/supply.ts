/**
 * 供应信息模块：加装验收单的数据结构与浏览器本地保存。
 * 只做登记与存取，不含校验规则和界面逻辑。
 */

export interface TankEntry {
  name: string; // 受油舱
  plan: string; // 计划量 (t)
  start: string; // 开始存量 (t)
  end: string; // 结束存量 (t)
  cap: string; // 舱容上限 (t)
}

export interface BunkerRecord {
  id: string | null;
  supplier: string; // 供应船
  grade: string; // 油品
  sealNo: string; // 封签号
  noteTotal: string; // 供油船计量单总重量 (t)
  handler: string; // 处理人（超差待处理时必填）
  signer: string; // 签收人
  signedAt: string | null; // 签收时间，未签收为 null
  createdAt: string | null;
  updatedAt: string | null;
  tanks: TankEntry[];
}

const KEY = "hxyfront-62001.bunker.v1";

function load(): BunkerRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BunkerRecord[]) : [];
  } catch {
    return [];
  }
}

function persist(list: BunkerRecord[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** 全部验收单，按最近更新排序 */
export function listRecords(): BunkerRecord[] {
  return load().sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

/** 新增或更新一单，回写 id / 时间戳 */
export function upsertRecord(rec: BunkerRecord): BunkerRecord {
  const all = load();
  const now = new Date().toISOString();
  if (!rec.id) {
    rec.id = `B${now.replace(/\D/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;
    rec.createdAt = now;
  }
  rec.updatedAt = now;
  const i = all.findIndex((r) => r.id === rec.id);
  if (i >= 0) all[i] = rec;
  else all.push(rec);
  persist(all);
  return rec;
}

export function removeRecord(id: string): void {
  persist(load().filter((r) => r.id !== id));
}

/** 空白验收单，预置两行常用受油舱 */
export function blankRecord(): BunkerRecord {
  return {
    id: null,
    supplier: "",
    grade: "",
    sealNo: "",
    noteTotal: "",
    handler: "",
    signer: "",
    signedAt: null,
    createdAt: null,
    updatedAt: null,
    tanks: [
      { name: "燃油舱 1P", plan: "", start: "", end: "", cap: "" },
      { name: "燃油舱 1S", plan: "", start: "", end: "", cap: "" },
    ],
  };
}

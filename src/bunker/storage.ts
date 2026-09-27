/** 浏览器本地保存：单据读写都经过这里，后续可替换为船队统一接口 */
import { BunkerRecord } from "./types";

const STORAGE_KEY = "hxyfront-62001:bunker-records:v1";

export function loadRecords(): BunkerRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BunkerRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: BunkerRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // 存储满或被禁用时静默失败，界面数据仍保留在内存中
  }
}

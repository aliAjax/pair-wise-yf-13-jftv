import { useCallback, useEffect, useState } from "react";
import { BunkerRecord } from "./types";
import { loadRecords, saveRecords } from "./storage";

/** 单据状态钩子：内存状态与浏览器本地保存同步 */
export function useBunkerRecords() {
  const [records, setRecords] = useState<BunkerRecord[]>(() => loadRecords());

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  const addRecord = useCallback((record: BunkerRecord) => {
    setRecords((prev) => [record, ...prev]);
  }, []);

  const updateRecord = useCallback((record: BunkerRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
  }, []);

  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { records, addRecord, updateRecord, removeRecord };
}

import { useMemo, useState } from "react";
import { BunkerRecord, TankEntry } from "./types";
import { OIL_TYPES, SUPPLIER_BARGES, TANK_PRESETS, tankPreset } from "./supply";
import {
  calcTank,
  canSign,
  checkDiscrepancy,
  recordErrors,
  recordStatus,
  sumCounted,
  sumPlanned,
} from "./validation";
import { fmtPct, fmtQty, fmtTime, newId, STATUS_META } from "./util";

interface Props {
  records: BunkerRecord[];
  addRecord: (r: BunkerRecord) => void;
  updateRecord: (r: BunkerRecord) => void;
  removeRecord: (id: string) => void;
}

function emptyTank(presetName = ""): TankEntry {
  const preset = presetName ? tankPreset(presetName) : undefined;
  return {
    id: newId(),
    tankName: presetName,
    planned: NaN,
    startQty: NaN,
    endQty: NaN,
    capacity: preset ? preset.capacity : NaN,
  };
}

function emptyDraft(): BunkerRecord {
  return {
    id: newId(),
    createdAt: new Date().toISOString(),
    supplierShip: "",
    oilType: OIL_TYPES[0],
    sealNo: "",
    noteTotal: NaN,
    tanks: [emptyTank()],
    handler: "",
    signedBy: "",
    signedAt: null,
  };
}

/** 吨数输入框：空值保持空白，内部用 NaN 表示未填 */
function QtyInput({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min="0"
      step="0.001"
      placeholder={placeholder}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.valueAsNumber)}
    />
  );
}

export default function BunkerAcceptance({
  records,
  addRecord,
  updateRecord,
  removeRecord,
}: Props) {
  const [draft, setDraft] = useState<BunkerRecord>(emptyDraft);
  const [showErrors, setShowErrors] = useState(false);

  const draftErrors = useMemo(() => recordErrors(draft), [draft]);
  const countedTotal = useMemo(() => sumCounted(draft.tanks), [draft.tanks]);
  const plannedTotal = useMemo(() => sumPlanned(draft.tanks), [draft.tanks]);
  const disc = useMemo(
    () => checkDiscrepancy(draft.noteTotal, countedTotal),
    [draft.noteTotal, countedTotal]
  );
  const draftStatus = recordStatus(draft);

  const patchDraft = (patch: Partial<BunkerRecord>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const patchTank = (id: string, patch: Partial<TankEntry>) =>
    setDraft((d) => ({
      ...d,
      tanks: d.tanks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));

  const saveDraft = () => {
    if (draftErrors.length > 0) {
      setShowErrors(true);
      return;
    }
    addRecord(draft);
    setDraft(emptyDraft());
    setShowErrors(false);
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>加装验收</p>
          <h2>燃油加装单据登记</h2>
        </div>
        <span className={STATUS_META[draftStatus].className}>
          {STATUS_META[draftStatus].label}
        </span>
      </div>

      <h3 className="sub-title">供应信息</h3>
      <div className="field-grid">
        <label>
          <span>供应船</span>
          <input
            list="supplier-barges"
            placeholder="填写或选择供油船"
            value={draft.supplierShip}
            onChange={(e) => patchDraft({ supplierShip: e.target.value })}
          />
        </label>
        <label>
          <span>油品</span>
          <select
            value={draft.oilType}
            onChange={(e) => patchDraft({ oilType: e.target.value })}
          >
            {OIL_TYPES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>封签号</span>
          <input
            placeholder="计量单/油样封签号"
            value={draft.sealNo}
            onChange={(e) => patchDraft({ sealNo: e.target.value })}
          />
        </label>
        <label>
          <span>计量单总重量(t)</span>
          <QtyInput
            value={draft.noteTotal}
            placeholder="供油船计量单总重量"
            onChange={(v) => patchDraft({ noteTotal: v })}
          />
        </label>
      </div>
      <datalist id="supplier-barges">
        {SUPPLIER_BARGES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <h3 className="sub-title">受油舱明细（超出舱容上限的部分不计入入账增量）</h3>
      <div className="tank-scroll">
        <table className="tank-table">
          <thead>
            <tr>
              <th>受油舱</th>
              <th>计划量(t)</th>
              <th>开始存量(t)</th>
              <th>结束存量(t)</th>
              <th>舱容上限(t)</th>
              <th>实测增量(t)</th>
              <th>超容未入账(t)</th>
              <th>入账增量(t)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {draft.tanks.map((t) => {
              const c = calcTank(t);
              return (
                <tr key={t.id} className={c.errors.length ? "row-error" : ""}>
                  <td>
                    <input
                      list="tank-presets"
                      placeholder="舱名"
                      value={t.tankName}
                      onChange={(e) => {
                        const name = e.target.value;
                        const preset = tankPreset(name);
                        patchTank(t.id, {
                          tankName: name,
                          ...(preset ? { capacity: preset.capacity } : {}),
                        });
                      }}
                    />
                  </td>
                  <td>
                    <QtyInput
                      value={t.planned}
                      onChange={(v) => patchTank(t.id, { planned: v })}
                    />
                  </td>
                  <td>
                    <QtyInput
                      value={t.startQty}
                      onChange={(v) => patchTank(t.id, { startQty: v })}
                    />
                  </td>
                  <td>
                    <QtyInput
                      value={t.endQty}
                      onChange={(v) => patchTank(t.id, { endQty: v })}
                    />
                  </td>
                  <td>
                    <QtyInput
                      value={t.capacity}
                      onChange={(v) => patchTank(t.id, { capacity: v })}
                    />
                  </td>
                  <td>{fmtQty(c.measured)}</td>
                  <td className={c.overflow > 0 ? "overflow" : ""}>
                    {c.overflow > 0 ? fmtQty(c.overflow) : "—"}
                  </td>
                  <td>
                    <strong>{fmtQty(c.counted)}</strong>
                  </td>
                  <td>
                    <button
                      className="row-del"
                      disabled={draft.tanks.length <= 1}
                      onClick={() =>
                        patchDraft({
                          tanks: draft.tanks.filter((x) => x.id !== t.id),
                        })
                      }
                    >
                      删
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <datalist id="tank-presets">
        {TANK_PRESETS.map((p) => (
          <option key={p.tankName} value={p.tankName} />
        ))}
      </datalist>
      <button
        className="add-row"
        onClick={() => patchDraft({ tanks: [...draft.tanks, emptyTank()] })}
      >
        + 添加受油舱
      </button>

      {draft.tanks.some((t) => calcTank(t).errors.length > 0) && (
        <ul className="error-list">
          {draft.tanks.flatMap((t, i) =>
            calcTank(t).errors.map((e) => (
              <li key={`${t.id}-${e}`}>
                {t.tankName.trim() || `第${i + 1}舱`}：{e}
              </li>
            ))
          )}
        </ul>
      )}

      <h3 className="sub-title">校验结果</h3>
      <div className="check-panel">
        <div>
          <small>计划量合计</small>
          <strong>{fmtQty(plannedTotal)} t</strong>
        </div>
        <div>
          <small>计量单总重量</small>
          <strong>{fmtQty(draft.noteTotal)} t</strong>
        </div>
        <div>
          <small>各舱入账合计</small>
          <strong>{fmtQty(countedTotal)} t</strong>
        </div>
        <div>
          <small>差值(计量单-入账)</small>
          <strong>{fmtQty(disc.diff)} t</strong>
        </div>
        <div>
          <small>差率(阈值1%)</small>
          <strong className={disc.overLimit ? "danger-text" : ""}>
            {fmtPct(disc.ratio)}
          </strong>
        </div>
      </div>
      {disc.overLimit && (
        <p className="warn-line">
          计量单总重量与各舱入账增量相差超过1%，保存后单据将停在「待处理」，需写明处理人后方可签收。
        </p>
      )}

      {showErrors && draftErrors.length > 0 && (
        <ul className="error-list">
          {draftErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="form-actions">
        <button
          onClick={() => {
            setDraft(emptyDraft());
            setShowErrors(false);
          }}
        >
          清空重填
        </button>
        <button className="primary" onClick={saveDraft}>
          保存单据
        </button>
      </div>

      <h3 className="sub-title">单据签收</h3>
      <div className="records">
        {records.length === 0 && (
          <p className="hint">暂无加装单据，保存后在此核对签收。</p>
        )}
        {records.map((rec) => {
          const counted = sumCounted(rec.tanks);
          const d = checkDiscrepancy(rec.noteTotal, counted);
          const st = recordStatus(rec);
          const sign = canSign(rec);
          return (
            <article key={rec.id} className="bunker-card">
              <header>
                <div>
                  <h3>
                    {rec.supplierShip} · {rec.oilType}
                  </h3>
                  <p>
                    封签号 {rec.sealNo} · 登记于 {fmtTime(rec.createdAt)}
                  </p>
                </div>
                <span className={STATUS_META[st].className}>
                  {STATUS_META[st].label}
                </span>
              </header>
              <p>
                计量单 {fmtQty(rec.noteTotal)} t · 入账合计 {fmtQty(counted)}{" "}
                t · 差值 {fmtQty(d.diff)} t（差率 {fmtPct(d.ratio)}）
              </p>
              <p>
                受油舱：
                {rec.tanks
                  .map((t) => `${t.tankName} +${fmtQty(calcTank(t).counted)}t`)
                  .join("、")}
              </p>
              {st === "pending" && (
                <p className="warn-line">
                  差率超过1%，本单停在待处理；写明处理人后才能签收。
                </p>
              )}
              {st !== "signed" ? (
                <>
                  <div className="sign-row">
                    <label>
                      <span>
                        处理人{st === "pending" ? "（差率超限，必填）" : "（选填）"}
                      </span>
                      <input
                        placeholder="差率超限时填写处理人"
                        value={rec.handler}
                        onChange={(e) =>
                          updateRecord({ ...rec, handler: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>签收人</span>
                      <input
                        placeholder="签收人姓名"
                        value={rec.signedBy}
                        onChange={(e) =>
                          updateRecord({ ...rec, signedBy: e.target.value })
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={!sign.ok}
                      title={sign.reason ?? ""}
                      onClick={() =>
                        updateRecord({
                          ...rec,
                          signedAt: new Date().toISOString(),
                        })
                      }
                    >
                      签收
                    </button>
                    <button
                      className="danger-btn"
                      onClick={() => {
                        if (window.confirm("确定作废该单据？")) {
                          removeRecord(rec.id);
                        }
                      }}
                    >
                      作废
                    </button>
                  </div>
                  {!sign.ok && <p className="hint">{sign.reason}</p>}
                </>
              ) : (
                <p className="hint">
                  签收人 {rec.signedBy} · {fmtTime(rec.signedAt ?? "")}
                  {rec.handler.trim() ? ` · 处理人 ${rec.handler}` : ""}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

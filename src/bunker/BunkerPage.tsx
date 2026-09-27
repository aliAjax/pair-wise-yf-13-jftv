/**
 * 界面模块：加装验收的渲染与交互。
 * 数据经 supply.ts 存取，规则经 validate.ts 判定。
 */

import { useEffect, useMemo, useState } from "react";
import {
  blankRecord,
  listRecords,
  removeRecord,
  upsertRecord,
  type BunkerRecord,
  type TankEntry,
} from "./supply";
import { STATUS_LABEL, TOL_PCT, signBlockers, summarize, type Summary } from "./validate";

const fmt = (n: number | null): string => (n === null ? "—" : n.toFixed(3));
const fmtPct = (n: number | null): string => (n === null ? "—" : `${n.toFixed(2)}%`);
const fmtTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString("zh-CN", { hour12: false }) : "—";

function Badge({ status }: { status: Summary["status"] }) {
  return <span className={`badge st-${status}`}>{STATUS_LABEL[status]}</span>;
}

export default function BunkerPage() {
  const [records, setRecords] = useState<BunkerRecord[]>(() => listRecords());
  const [cur, setCur] = useState<BunkerRecord | null>(null);

  // 任何改动即保存到浏览器，并刷新台账
  useEffect(() => {
    if (!cur) return;
    upsertRecord(cur);
    setRecords(listRecords());
  }, [cur]);

  const sum = useMemo(() => (cur ? summarize(cur) : null), [cur]);
  const blockers = useMemo(
    () => (cur && sum ? signBlockers(cur, sum) : []),
    [cur, sum]
  );
  const locked = !!cur?.signedAt;

  const update = (patch: Partial<BunkerRecord>) =>
    setCur((c) => (c ? { ...c, ...patch } : c));
  const updateTank = (i: number, patch: Partial<TankEntry>) =>
    setCur((c) =>
      c ? { ...c, tanks: c.tanks.map((t, j) => (j === i ? { ...t, ...patch } : t)) } : c
    );
  const addTank = () =>
    setCur((c) =>
      c
        ? { ...c, tanks: [...c.tanks, { name: `燃油舱 ${c.tanks.length + 1}`, plan: "", start: "", end: "", cap: "" }] }
        : c
    );
  const removeTank = (i: number) =>
    setCur((c) => (c ? { ...c, tanks: c.tanks.filter((_, j) => j !== i) } : c));

  const openRecord = (id: string | null) => {
    const rec = records.find((r) => r.id === id);
    if (rec) setCur(JSON.parse(JSON.stringify(rec)) as BunkerRecord);
  };

  const del = () => {
    if (!cur?.id) return;
    if (!window.confirm("确定删除这张验收单？删除后不可恢复。")) return;
    removeRecord(cur.id);
    setCur(null);
    setRecords(listRecords());
  };

  const sign = () => {
    if (!cur || !sum || blockers.length > 0) return;
    if (
      !window.confirm(
        `确认签收？\n计量单总重 ${fmt(sum.noteTotal)} t，各舱入账合计 ${sum.bookedTotal.toFixed(3)} t，偏差 ${fmtPct(sum.pct)}。签收后单据锁定。`
      )
    )
      return;
    setCur((c) => (c ? { ...c, signedAt: new Date().toISOString() } : c));
  };

  const unsigned = records.filter((r) => !r.signedAt);

  return (
    <div className="bunker">
      <section className="panel">
        <div className="heading">
          <div>
            <p>加装验收</p>
            <h2>供应信息登记</h2>
          </div>
          <div className="btn-row">
            <button onClick={() => setCur(blankRecord())}>＋ 新建验收单</button>
            {cur && (
              <button className="danger" onClick={del}>
                删除本单
              </button>
            )}
          </div>
        </div>

        {!cur || !sum ? (
          <p className="empty">从下方台账选择单据，或点击「新建验收单」开始登记。</p>
        ) : (
          <>
            <div className="field-grid four">
              <label>
                <span>供应船</span>
                <input
                  value={cur.supplier}
                  disabled={locked}
                  placeholder="供油船名 / 牌号"
                  onChange={(e) => update({ supplier: e.target.value })}
                />
              </label>
              <label>
                <span>油品</span>
                <input
                  value={cur.grade}
                  disabled={locked}
                  placeholder="如 VLSFO 0.5%、MGO"
                  onChange={(e) => update({ grade: e.target.value })}
                />
              </label>
              <label>
                <span>封签号</span>
                <input
                  value={cur.sealNo}
                  disabled={locked}
                  placeholder="流量计 / 舱口封签编号"
                  onChange={(e) => update({ sealNo: e.target.value })}
                />
              </label>
              <label>
                <span>计量单总重量 (t)</span>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={cur.noteTotal}
                  disabled={locked}
                  placeholder="供油船计量单数"
                  onChange={(e) => update({ noteTotal: e.target.value })}
                />
              </label>
            </div>

            <h3 className="sub-title">受油舱实测</h3>
            <div className="table-wrap">
              <table className="tank-table">
                <thead>
                  <tr>
                    <th>受油舱</th>
                    <th>计划量 (t)</th>
                    <th>开始存量 (t)</th>
                    <th>结束存量 (t)</th>
                    <th>舱容上限 (t)</th>
                    <th>实测增量 (t)</th>
                    <th>入账增量 (t)</th>
                    <th>校验备注</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cur.tanks.map((t, i) => {
                    const c = sum.calcs[i];
                    return (
                      <tr key={i}>
                        <td>
                          <input
                            value={t.name}
                            disabled={locked}
                            onChange={(e) => updateTank(i, { name: e.target.value })}
                          />
                        </td>
                        {(["plan", "start", "end", "cap"] as const).map((f) => (
                          <td key={f}>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={t[f]}
                              disabled={locked}
                              onChange={(e) => updateTank(i, { [f]: e.target.value })}
                            />
                          </td>
                        ))}
                        <td className="num">{fmt(c.measured)}</td>
                        <td className={`num ${c.clipped > 0 ? "warn" : ""}`}>{fmt(c.booked)}</td>
                        <td className="note">{c.problems.join("；") || "—"}</td>
                        <td>
                          <button
                            className="icon"
                            title="移除该舱"
                            disabled={locked}
                            onClick={() => removeTank(i)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={addTank} disabled={locked}>
              ＋ 添加受油舱
            </button>

            <div className={`verdict st-${sum.status}`}>
              <div className="verdict-figures">
                <div>
                  <small>计量单总重</small>
                  <b>{fmt(sum.noteTotal)} t</b>
                </div>
                <div>
                  <small>各舱入账合计</small>
                  <b>{sum.bookedTotal.toFixed(3)} t</b>
                </div>
                <div>
                  <small>差值</small>
                  <b>{sum.diff === null ? "—" : `${sum.diff > 0 ? "+" : ""}${sum.diff.toFixed(3)} t`}</b>
                </div>
                <div>
                  <small>偏差（限 {TOL_PCT}%）</small>
                  <b className={sum.overTol ? "warn" : ""}>{fmtPct(sum.pct)}</b>
                </div>
                <div>
                  <small>超舱容未入账</small>
                  <b className={sum.clippedTotal > 0 ? "warn" : ""}>
                    {sum.clippedTotal.toFixed(3)} t
                  </b>
                </div>
                <div>
                  <small>计划量合计</small>
                  <b>{sum.planTotal.toFixed(3)} t</b>
                </div>
              </div>
              <div className="verdict-status">
                <Badge status={sum.status} />
                {sum.status === "pending" && (
                  <span>总重量与各舱增量相差超过 {TOL_PCT}%，本单停在待处理，写明处理人后才能签收。</span>
                )}
                {sum.status === "ready" && <span>偏差在允许范围内，可签收。</span>}
                {sum.status === "draft" && <span>请补齐各舱存量与计量单总重。</span>}
                {sum.status === "signed" && <span>本单已签收锁定。</span>}
              </div>
              {blockers.length > 0 && !locked && (
                <ul className="problems">
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="sign-row">
              <label>
                <span>处理人{sum.overTol ? "（超差必填）" : ""}</span>
                <input
                  value={cur.handler}
                  disabled={locked}
                  placeholder="超差时填写处理人"
                  onChange={(e) => update({ handler: e.target.value })}
                />
              </label>
              <label>
                <span>签收人</span>
                <input
                  value={cur.signer}
                  disabled={locked}
                  placeholder="值班轮机员签字"
                  onChange={(e) => update({ signer: e.target.value })}
                />
              </label>
              <button
                className="primary"
                disabled={locked || blockers.length > 0}
                onClick={sign}
              >
                {locked ? "已签收" : "签收"}
              </button>
            </div>
            {cur.signedAt && (
              <p className="signed-line">
                已于 {fmtTime(cur.signedAt)} 由 {cur.signer} 签收
                {cur.handler ? `，处理人：${cur.handler}` : ""}。
              </p>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>交接摘要</p>
            <h2>未签收单据（{unsigned.length}）</h2>
          </div>
        </div>
        {unsigned.length === 0 ? (
          <p className="empty">没有待交接的未签收单据。</p>
        ) : (
          <div className="table-wrap">
            <table className="tank-table">
              <thead>
                <tr>
                  <th>供应船</th>
                  <th>油品</th>
                  <th>封签号</th>
                  <th>计量单总重 (t)</th>
                  <th>入账合计 (t)</th>
                  <th>偏差</th>
                  <th>状态</th>
                  <th>处理人</th>
                  <th>更新于</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {unsigned.map((r) => {
                  const s = summarize(r);
                  return (
                    <tr key={r.id}>
                      <td>{r.supplier || "—"}</td>
                      <td>{r.grade || "—"}</td>
                      <td>{r.sealNo || "—"}</td>
                      <td className="num">{fmt(s.noteTotal)}</td>
                      <td className="num">{s.bookedTotal.toFixed(3)}</td>
                      <td className={`num ${s.overTol ? "warn" : ""}`}>{fmtPct(s.pct)}</td>
                      <td>
                        <Badge status={s.status} />
                      </td>
                      <td>{r.handler || "—"}</td>
                      <td>{fmtTime(r.updatedAt)}</td>
                      <td>
                        <button onClick={() => openRecord(r.id)}>打开</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>单据台账</p>
            <h2>全部验收单（{records.length}）</h2>
          </div>
        </div>
        {records.length === 0 ? (
          <p className="empty">暂无记录，点击「新建验收单」开始。</p>
        ) : (
          <div className="records">
            {records.map((r) => {
              const s = summarize(r);
              return (
                <article key={r.id}>
                  <b>{r.grade ? r.grade.slice(0, 2) : "油"}</b>
                  <div>
                    <h3>
                      {r.supplier || "未填供应船"} · {r.grade || "未填油品"} <Badge status={s.status} />
                    </h3>
                    <p>
                      封签号 {r.sealNo || "—"} · 计量单 {fmt(s.noteTotal)} t · 入账{" "}
                      {s.bookedTotal.toFixed(3)} t · 偏差 {fmtPct(s.pct)}
                      {r.signedAt
                        ? ` · ${fmtTime(r.signedAt)} 由 ${r.signer} 签收`
                        : ` · 更新于 ${fmtTime(r.updatedAt)}`}
                      <button className="link" onClick={() => openRecord(r.id)}>
                        打开
                      </button>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

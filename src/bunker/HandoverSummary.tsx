import { BunkerRecord } from "./types";
import { checkDiscrepancy, recordStatus, sumCounted } from "./validation";
import { fmtPct, fmtQty, fmtTime, STATUS_META } from "./util";

/** 交接摘要：未签收的加装单据自动带入，提醒接班人员跟进 */
export default function HandoverSummary({ records }: { records: BunkerRecord[] }) {
  const unsigned = records.filter((r) => !r.signedAt);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>交接摘要</p>
          <h2>未签收加装单据（{unsigned.length}）</h2>
        </div>
      </div>
      {unsigned.length === 0 ? (
        <p className="hint">本班无未签收的加装单据。</p>
      ) : (
        <div className="records">
          {unsigned.map((rec) => {
            const counted = sumCounted(rec.tanks);
            const d = checkDiscrepancy(rec.noteTotal, counted);
            const st = recordStatus(rec);
            return (
              <article key={rec.id}>
                <b>{st === "pending" ? "待" : "签"}</b>
                <div>
                  <h3>
                    {rec.supplierShip} · {rec.oilType}{" "}
                    <span className={STATUS_META[st].className}>
                      {STATUS_META[st].label}
                    </span>
                  </h3>
                  <p>
                    封签号 {rec.sealNo} · 登记于 {fmtTime(rec.createdAt)} ·
                    计量单 {fmtQty(rec.noteTotal)} t · 入账 {fmtQty(counted)} t
                    · 差率 {fmtPct(d.ratio)}
                    {st === "pending" &&
                      (rec.handler.trim()
                        ? ` · 处理人 ${rec.handler}`
                        : " · 处理人未填写")}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

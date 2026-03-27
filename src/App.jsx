import { useState, useEffect, useCallback } from "react";

// ===== FORMATTERS =====
const yen = (n) => (n != null && !isNaN(n)) ? `¥${Math.round(n).toLocaleString('ja-JP')}` : '—';
const pct = (n, d = 1) => (n != null && !isNaN(n)) ? `${n.toFixed(d)}%` : '—';

// ===== CONSTANTS =====
const STATUS_LIST = ['未着手', '交渉中', '合意済み', '完了'];
const STATUS_CFG = {
  '未着手': { bg: '#f1f5f9', fg: '#64748b', dot: '#94a3b8' },
  '交渉中': { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' },
  '合意済み': { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b' },
  '完了':   { bg: '#dcfce7', fg: '#15803d', dot: '#22c55e' },
};

const DEFAULT_SETTINGS = {
  targetIncreaseRate: 5,
  targetUtilizationRate: 95,
  targetResignationRate: 20,
  fiscalYear: '2025年度',
  remainingMonths: 9,
};
const DEFAULT_ORG = {
  totalHeadcount: 150,
  standbyCount: 24,
  currentResignations: 8,
  avgStandbyCost: 320000,
};
const SEED_NEG = [
  { id: 1, techName: '田中 建太',  customerName: '清水建設',   currentRate: 550000, negotiatedRate: 583000, status: '完了' },
  { id: 2, techName: '鈴木 大樹',  customerName: '大林組',     currentRate: 480000, negotiatedRate: 509000, status: '完了' },
  { id: 3, techName: '山本 翔',    customerName: '鹿島建設',   currentRate: 520000, negotiatedRate: 551000, status: '合意済み' },
  { id: 4, techName: '佐藤 健一',  customerName: '竹中工務店', currentRate: 600000, negotiatedRate: 636000, status: '交渉中' },
  { id: 5, techName: '中村 誠',    customerName: '清水建設',   currentRate: 450000, negotiatedRate: null,   status: '未着手' },
  { id: 6, techName: '小林 雄介',  customerName: '大林組',     currentRate: 500000, negotiatedRate: null,   status: '未着手' },
  { id: 7, techName: '加藤 龍',    customerName: '鹿島建設',   currentRate: 470000, negotiatedRate: 498000, status: '交渉中' },
  { id: 8, techName: '渡辺 亮',    customerName: '竹中工務店', currentRate: 560000, negotiatedRate: 594000, status: '完了' },
];

// ===== STORAGE =====
const store = {
  get: async (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: async (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ===== SMALL COMPONENTS =====
const StatusBadge = ({ s }) => (
  <span style={{ background: STATUS_CFG[s]?.bg, color: STATUS_CFG[s]?.fg, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_CFG[s]?.dot, display: 'inline-block', marginRight: 5, verticalAlign: 'middle' }} />
    {s}
  </span>
);

const KpiCard = ({ label, value, sub, status = 'neutral' }) => {
  const colors = { good: ['#f0fdf4','#166534','#bbf7d0'], bad: ['#fff1f2','#9f1239','#fecdd3'], warn: ['#fffbeb','#92400e','#fde68a'], neutral: ['#f8fafc','#1e293b','#e2e8f0'], blue: ['#eff6ff','#1e40af','#bfdbfe'] };
  const [bg, fg, border] = colors[status] || colors.neutral;
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: fg, opacity: 0.7, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: fg, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: fg, opacity: 0.6, marginTop: 4 }}>{sub}</div>}
    </div>
  );
};

const Bar = ({ value, max, color = '#3b82f6', h = 8 }) => (
  <div style={{ background: '#e2e8f0', borderRadius: 99, height: h, overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .4s ease' }} />
  </div>
);

const Inp = ({ value, onChange, type = 'text', placeholder = '' }) => (
  <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '5px 9px', fontSize: 12, width: '100%', outline: 'none', background: '#fff' }} />
);

const Sel = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '5px 9px', fontSize: 12, width: '100%', outline: 'none', background: '#fff' }}>
    {options.map(o => <option key={o}>{o}</option>)}
  </select>
);

const Btn = ({ onClick, children, variant = 'primary', small = false }) => {
  const styles = {
    primary: { background: '#1e293b', color: '#fff' },
    ghost: { background: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' },
    danger: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
    success: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], borderRadius: 6, padding: small ? '4px 10px' : '6px 14px', fontSize: small ? 11 : 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, border: styles[variant].border || 'none', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
};

// ===== GAUGE =====
const Gauge = ({ value, target, size = 150 }) => {
  const r = 52, cx = 75, cy = 75;
  const C = 2 * Math.PI * r;
  const cap = Math.max(target * 1.1, 100);
  const vPct = Math.min(value, cap) / cap;
  const tPct = target / cap;
  const color = value >= target ? '#16a34a' : value >= target - 5 ? '#d97706' : '#dc2626';
  const targetAngle = tPct * 360 - 90;
  const rad = (deg) => deg * Math.PI / 180;
  const tx = cx + r * Math.cos(rad(targetAngle));
  const ty = cy + r * Math.sin(rad(targetAngle));
  return (
    <svg width={size} height={size} viewBox="0 0 150 150">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={14} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={14}
        strokeDasharray={C} strokeDashoffset={C * (1 - vPct)}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <line x1={cx} y1={cy - r + 4} x2={cx} y2={cy - r - 4} stroke="#ef4444" strokeWidth={3}
        transform={`rotate(${tPct * 360} ${cx} ${cy})`} strokeLinecap="round" />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={22} fontWeight={700} fill={color} fontFamily="monospace">{value.toFixed(1)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">% 稼働率</text>
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize={9} fill="#cbd5e1">目標 {target}%</text>
    </svg>
  );
};

// ===== MODULE: 単価交渉 =====
function NegotiationModule({ negotiations, setNegotiations, settings }) {
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ techName: '', customerName: '', currentRate: '', negotiatedRate: '', status: '未着手' });

  const totalBase = negotiations.reduce((a, n) => a + (n.currentRate || 0), 0);
  const done = negotiations.filter(n => n.status === '完了');
  const agreed = negotiations.filter(n => n.status === '合意済み' || n.status === '完了');
  const doneImprove = done.reduce((a, n) => a + ((n.negotiatedRate || 0) - n.currentRate), 0);
  const agreedImprove = agreed.reduce((a, n) => a + ((n.negotiatedRate || 0) - n.currentRate), 0);
  const donePct = totalBase > 0 ? (doneImprove / totalBase) * 100 : 0;
  const agreedPct = totalBase > 0 ? (agreedImprove / totalBase) * 100 : 0;
  const targetMonthly = totalBase * settings.targetIncreaseRate / 100;
  const gapMonthly = targetMonthly - doneImprove;
  const annualDone = doneImprove * settings.remainingMonths;
  const annualTarget = targetMonthly * settings.remainingMonths;

  const confirmEdit = () => {
    setNegotiations(negotiations.map(n => n.id === editId
      ? { ...editData, currentRate: Number(editData.currentRate), negotiatedRate: editData.negotiatedRate ? Number(editData.negotiatedRate) : null }
      : n));
    setEditId(null);
  };
  const del = (id) => setNegotiations(negotiations.filter(n => n.id !== id));
  const add = () => {
    if (!newRow.techName || !newRow.currentRate) return;
    setNegotiations([...negotiations, { ...newRow, id: Date.now(), currentRate: Number(newRow.currentRate), negotiatedRate: newRow.negotiatedRate ? Number(newRow.negotiatedRate) : null }]);
    setNewRow({ techName: '', customerName: '', currentRate: '', negotiatedRate: '', status: '未着手' });
    setAdding(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="完了済み単価アップ率" value={pct(donePct)} sub={`目標: ${settings.targetIncreaseRate}%`} status={donePct >= settings.targetIncreaseRate ? 'good' : donePct >= settings.targetIncreaseRate * 0.5 ? 'warn' : 'bad'} />
        <KpiCard label="目標との差分" value={pct(Math.max(0, settings.targetIncreaseRate - donePct))} sub={`月次不足: ${yen(Math.max(0, gapMonthly))}`} status={gapMonthly <= 0 ? 'good' : 'bad'} />
        <KpiCard label="月次粗利改善（完了）" value={yen(doneImprove)} sub={`合意含む見込: ${yen(agreedImprove)}`} status="blue" />
        <KpiCard label="通期粗利改善見込み" value={yen(annualDone)} sub={`目標: ${yen(annualTarget)}`} status={annualDone >= annualTarget ? 'good' : 'neutral'} />
      </div>

      {/* Progress */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>交渉進捗率（対全体単価）</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{done.length}/{negotiations.length}件 完了</span>
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#64748b', marginBottom: 6 }}>
          <span>■ 完了: {pct(donePct)}</span>
          <span style={{ color: '#d97706' }}>■ 合意含む: {pct(agreedPct)}</span>
          <span style={{ color: '#ef4444', marginLeft: 'auto' }}>目標ライン: {settings.targetIncreaseRate}%</span>
        </div>
        <div style={{ position: 'relative', height: 12, background: '#f1f5f9', borderRadius: 99, overflow: 'visible' }}>
          <div style={{ position: 'absolute', height: '100%', width: `${Math.min(100, agreedPct / (settings.targetIncreaseRate * 1.3) * 100)}%`, background: '#fde68a', borderRadius: 99 }} />
          <div style={{ position: 'absolute', height: '100%', width: `${Math.min(100, donePct / (settings.targetIncreaseRate * 1.3) * 100)}%`, background: '#22c55e', borderRadius: 99 }} />
          <div style={{ position: 'absolute', top: -3, bottom: -3, width: 2, background: '#ef4444', left: `${(settings.targetIncreaseRate / (settings.targetIncreaseRate * 1.3)) * 100}%` }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>交渉一覧</span>
          <Btn onClick={() => setAdding(!adding)} small>＋ 追加</Btn>
        </div>

        {adding && (
          <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 1.5fr auto', gap: 8, alignItems: 'center' }}>
            <Inp value={newRow.techName} onChange={v => setNewRow({ ...newRow, techName: v })} placeholder="技術者名" />
            <Inp value={newRow.customerName} onChange={v => setNewRow({ ...newRow, customerName: v })} placeholder="顧客名" />
            <Inp value={newRow.currentRate} onChange={v => setNewRow({ ...newRow, currentRate: v })} type="number" placeholder="現在単価" />
            <Inp value={newRow.negotiatedRate} onChange={v => setNewRow({ ...newRow, negotiatedRate: v })} type="number" placeholder="交渉後単価" />
            <Sel value={newRow.status} onChange={v => setNewRow({ ...newRow, status: v })} options={STATUS_LIST} />
            <div style={{ display: 'flex', gap: 4 }}>
              <Btn onClick={add} variant="success" small>✓</Btn>
              <Btn onClick={() => setAdding(false)} variant="ghost" small>✕</Btn>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['技術者名', '顧客', '現在単価', '交渉後単価', 'アップ率', '月次改善額', 'ステータス', ''].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: h === '技術者名' || h === '顧客' ? 'left' : 'right', fontSize: 11, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', ...(h === '' ? { width: 60 } : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {negotiations.map(n => {
                const upRate = n.negotiatedRate ? ((n.negotiatedRate - n.currentRate) / n.currentRate) * 100 : null;
                const improve = n.negotiatedRate ? n.negotiatedRate - n.currentRate : null;
                const isEdit = editId === n.id;
                return (
                  <tr key={n.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    {isEdit ? (
                      <>
                        <td style={{ padding: '6px 14px' }}><Inp value={editData.techName} onChange={v => setEditData({ ...editData, techName: v })} /></td>
                        <td style={{ padding: '6px 14px' }}><Inp value={editData.customerName} onChange={v => setEditData({ ...editData, customerName: v })} /></td>
                        <td style={{ padding: '6px 14px' }}><Inp value={editData.currentRate} onChange={v => setEditData({ ...editData, currentRate: v })} type="number" /></td>
                        <td style={{ padding: '6px 14px' }}><Inp value={editData.negotiatedRate || ''} onChange={v => setEditData({ ...editData, negotiatedRate: v })} type="number" /></td>
                        <td colSpan={2} />
                        <td style={{ padding: '6px 14px' }}><Sel value={editData.status} onChange={v => setEditData({ ...editData, status: v })} options={STATUS_LIST} /></td>
                        <td style={{ padding: '6px 14px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Btn onClick={confirmEdit} variant="success" small>✓</Btn>
                            <Btn onClick={() => setEditId(null)} variant="ghost" small>✕</Btn>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '9px 14px', color: '#1e293b', fontWeight: 500 }}>{n.techName}</td>
                        <td style={{ padding: '9px 14px', color: '#64748b' }}>{n.customerName}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#334155' }}>{yen(n.currentRate)}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#334155' }}>{n.negotiatedRate ? yen(n.negotiatedRate) : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {upRate != null ? <span style={{ color: upRate >= settings.targetIncreaseRate ? '#16a34a' : '#1d4ed8', fontWeight: 600 }}>{pct(upRate)}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#3b82f6' }}>
                          {improve != null ? `+${yen(improve)}` : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 14px' }}><StatusBadge s={n.status} /></td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditId(n.id); setEditData({ ...n }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13 }}>✏</button>
                            <button onClick={() => del(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', fontSize: 13 }}>🗑</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                <td style={{ padding: '8px 14px', fontSize: 11, color: '#64748b', fontWeight: 600 }} colSpan={2}>合計 {negotiations.length}件</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#334155' }}>{yen(totalBase)}</td>
                <td colSpan={2} />
                <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#3b82f6' }}>+{yen(doneImprove)}/月</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== MODULE: 稼働率 =====
function UtilizationModule({ org, setOrg, settings }) {
  const active = org.totalHeadcount - org.standbyCount;
  const rate = (active / org.totalHeadcount) * 100;
  const gap = settings.targetUtilizationRate - rate;
  const monthlyCost = org.standbyCount * org.avgStandbyCost;
  const minReq = Math.ceil(org.totalHeadcount * settings.targetUtilizationRate / 100);
  const needed = Math.max(0, minReq - active);

  const scenarios = [0, 5, 10, 15, org.standbyCount].filter((v, i, a) => a.indexOf(v) === i).map(n => {
    const newSB = Math.max(0, org.standbyCount - n);
    const newAct = org.totalHeadcount - newSB;
    const newRate = (newAct / org.totalHeadcount) * 100;
    return { place: n, standby: newSB, rate: newRate, cost: newSB * org.avgStandbyCost, saving: monthlyCost - newSB * org.avgStandbyCost };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="現在稼働率" value={pct(rate)} sub={`目標: ${settings.targetUtilizationRate}%`} status={rate >= settings.targetUtilizationRate ? 'good' : gap > 5 ? 'bad' : 'warn'} />
        <KpiCard label="稼働 / 所属" value={`${active}名 / ${org.totalHeadcount}名`} sub={`待機: ${org.standbyCount}名`} status="blue" />
        <KpiCard label="月次待機コスト" value={yen(monthlyCost)} sub={`年間: ${yen(monthlyCost * 12)}`} status={org.standbyCount > 0 ? 'bad' : 'good'} />
        <KpiCard label="95%達成に必要" value={`配属 ${needed}名`} sub={`最低稼働必要: ${minReq}名`} status={needed === 0 ? 'good' : 'warn'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>稼働率ゲージ</div>
          <Gauge value={rate} target={settings.targetUtilizationRate} size={160} />
          {gap > 0 && <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626', fontWeight: 600, textAlign: 'center' }}>目標まで {pct(gap)} 不足<br /><span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>あと {needed}名 配属が必要</span></div>}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>データ更新</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[{ label: '所属人数', key: 'totalHeadcount', unit: '名' }, { label: '待機人数', key: 'standbyCount', unit: '名' }, { label: '1人あたり月次待機コスト', key: 'avgStandbyCost', unit: '円' }].map(({ label, key, unit }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: '#64748b', width: 200 }}>{label}</label>
                <input type="number" value={org[key]} onChange={e => setOrg({ ...org, [key]: Number(e.target.value) })}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: 120, fontFamily: 'monospace', textAlign: 'right' }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{unit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>配属シナリオ別シミュレーション</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['追加配属数', '稼働率', '残待機人数', '月次待機コスト', '月次コスト削減', '判定'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: h === '追加配属数' ? 'left' : 'right', fontSize: 11, color: '#94a3b8', fontWeight: 600, ...(h === '判定' ? { textAlign: 'center' } : {}) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9', background: s.rate >= settings.targetUtilizationRate ? '#f0fdf4' : '#fff' }}>
                <td style={{ padding: '9px 14px', fontWeight: 500 }}>+{s.place}名</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: s.rate >= settings.targetUtilizationRate ? '#16a34a' : '#dc2626' }}>{pct(s.rate)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b' }}>{s.standby}名</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>{yen(s.cost)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>+{yen(s.saving)}</td>
                <td style={{ padding: '9px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: s.rate >= settings.targetUtilizationRate ? '#16a34a' : '#94a3b8' }}>
                  {s.rate >= settings.targetUtilizationRate ? '✓ 目標達成' : '未達'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== MODULE: 離職管理 =====
function ResignationModule({ org, setOrg, settings }) {
  const active = org.totalHeadcount - org.standbyCount;
  const minReq = Math.ceil(org.totalHeadcount * settings.targetUtilizationRate / 100);
  const allowableByUtil = Math.max(0, active - minReq);
  const rateMax = Math.floor(org.totalHeadcount * settings.targetResignationRate / 100);
  const remaining = rateMax - org.currentResignations;
  const currentRate = (org.currentResignations / org.totalHeadcount) * 100;
  const level = remaining <= 0 ? 'bad' : remaining <= 5 ? 'warn' : 'good';
  const msgs = {
    bad: `⚠ 目標離職率 ${settings.targetResignationRate}% を超過しています。即時対策が必要です。`,
    warn: `⚠ 残り ${remaining}名で目標上限に達します。注意が必要です。`,
    good: `目標範囲内です。あと ${remaining}名まで許容できます。`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="現在離職人数（通期）" value={`${org.currentResignations}名`} sub={`離職率: ${pct(currentRate)}`} status={currentRate > settings.targetResignationRate ? 'bad' : 'good'} />
        <KpiCard label="目標最大離職数" value={`${rateMax}名`} sub={`目標離職率: ${settings.targetResignationRate}%`} status="neutral" />
        <KpiCard label="追加許容離職数" value={`あと ${Math.max(0, remaining)}名`} sub={remaining <= 0 ? '⚠ 超過中' : '予算達成ライン'} status={level} />
        <KpiCard label="稼働維持の許容数" value={`あと ${allowableByUtil}名`} sub={`稼働率${settings.targetUtilizationRate}%維持ライン`} status={allowableByUtil <= 0 ? 'bad' : allowableByUtil <= 3 ? 'warn' : 'good'} />
      </div>

      <div style={{ borderRadius: 8, padding: '12px 16px', fontSize: 13, fontWeight: 500, ...({ bad: { background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' }, warn: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }, good: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } }[level]) }}>
        {msgs[level]}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>離職進捗（対目標上限）</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
          <span>現在: {org.currentResignations}名 ({pct(currentRate)})</span>
          <span>目標上限: {rateMax}名 ({settings.targetResignationRate}%)</span>
        </div>
        <Bar value={org.currentResignations} max={rateMax} color={level === 'bad' ? '#ef4444' : level === 'warn' ? '#f59e0b' : '#22c55e'} h={14} />
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>{org.currentResignations} / {rateMax}名</div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>データ更新</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[{ label: '所属人数', key: 'totalHeadcount', unit: '名' }, { label: '離職人数（通期実績）', key: 'currentResignations', unit: '名' }].map(({ label, key, unit }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 12, color: '#64748b', width: 160 }}>{label}</label>
              <input type="number" value={org[key]} onChange={e => setOrg({ ...org, [key]: Number(e.target.value) })}
                style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: 90, fontFamily: 'monospace', textAlign: 'right' }} />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== MODULE: 回収シミュレーター =====
function RecoveryModule({ org, settings, totalCurrentBase }) {
  const [lossMonths, setLossMonths] = useState(3);
  const [recoveryTarget, setRecoveryTarget] = useState(6);
  const [customRate, setCustomRate] = useState(5);
  const [customPlace, setCustomPlace] = useState(10);

  const monthlyCost = org.standbyCount * org.avgStandbyCost;
  const totalLoss = monthlyCost * lossMonths;
  const avgRate = totalCurrentBase > 0 ? totalCurrentBase / (org.totalHeadcount - org.standbyCount || 1) : 500000;

  const calcScenario = (rateUp, place) => {
    const rGain = totalCurrentBase * rateUp / 100;
    const pGain = place * avgRate * 0.30;
    const total = rGain + pGain;
    const months = total > 0 ? Math.ceil(totalLoss / total) : 9999;
    return { rGain, pGain, total, months, ok: months <= recoveryTarget };
  };

  const presets = [
    { label: '単価交渉メイン', rateUp: 10, place: 5 },
    { label: 'バランス型', rateUp: 5, place: 10 },
    { label: '配属メイン', rateUp: 2, place: 18 },
    { label: '待機ゼロ達成', rateUp: 3, place: org.standbyCount },
  ];
  const custom = calcScenario(customRate, customPlace);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KpiCard label="月次待機コスト（損失）" value={yen(monthlyCost)} sub={`待機 ${org.standbyCount}名`} status="bad" />
        <KpiCard label="累積損失額" value={yen(totalLoss)} sub={`${lossMonths}ヶ月分`} status="bad" />
        <KpiCard label="回収目標期間" value={`${recoveryTarget}ヶ月`} sub="設定した期間内で回収" status="blue" />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>シミュレーション設定</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[{ label: `損失発生月数: ${lossMonths}ヶ月`, val: lossMonths, set: setLossMonths, min: 1, max: 12 }, { label: `回収目標期間: ${recoveryTarget}ヶ月`, val: recoveryTarget, set: setRecoveryTarget, min: 1, max: 24 }].map(({ label, val, set, min, max }) => (
            <div key={label}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
              <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>プリセットシナリオ</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['シナリオ', '単価アップ', '新規配属', '月次改善額', '回収期間', '判定'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: h === 'シナリオ' ? 'left' : 'right', fontSize: 11, color: '#94a3b8', fontWeight: 600, ...(h === '判定' ? { textAlign: 'center' } : {}) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {presets.map((p, i) => {
              const s = calcScenario(p.rateUp, p.place);
              return (
                <tr key={i} style={{ borderTop: '1px solid #f1f5f9', background: s.ok ? '#f0fdf4' : '#fff' }}>
                  <td style={{ padding: '9px 14px', fontWeight: 500, color: '#1e293b' }}>{p.label}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#64748b' }}>+{p.rateUp}% ({yen(s.rGain)}/月)</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: '#64748b' }}>+{p.place}名</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6' }}>{yen(s.total)}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: s.ok ? '#16a34a' : '#64748b' }}>{s.months < 999 ? `${s.months}ヶ月` : '—'}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: s.ok ? '#16a34a' : '#94a3b8' }}>{s.ok ? '✓ 達成' : '未達'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '8px 16px', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9' }}>※ 新規配属は粗利率30%で計算。単価改善は全技術者の現在単価合計を基準に算出。</div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>カスタムシミュレーション</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>
          {[{ label: `単価アップ率: ${customRate}%`, val: customRate, set: setCustomRate, min: 0, max: 20 }, { label: `新規配属数: ${customPlace}名`, val: customPlace, set: setCustomPlace, min: 0, max: 60 }].map(({ label, val, set, min, max }) => (
            <div key={label}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
              <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))} style={{ width: '100%', accentColor: '#6366f1' }} />
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 8, padding: '12px 16px', background: custom.ok ? '#f0fdf4' : '#f8fafc', border: `1px solid ${custom.ok ? '#bbf7d0' : '#e2e8f0'}` }}>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <div><span style={{ color: '#94a3b8', fontSize: 11 }}>月次改善額</span><br /><span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#3b82f6' }}>{yen(custom.total)}</span></div>
            <div><span style={{ color: '#94a3b8', fontSize: 11 }}>回収期間</span><br /><span style={{ fontWeight: 700, fontFamily: 'monospace', color: custom.ok ? '#16a34a' : '#1e293b' }}>{custom.months < 999 ? `${custom.months}ヶ月` : '—'}</span></div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}><span style={{ fontWeight: 700, fontSize: 14, color: custom.ok ? '#16a34a' : '#94a3b8' }}>{custom.ok ? `✓ 目標 ${recoveryTarget}ヶ月以内に回収可能` : `目標 ${recoveryTarget}ヶ月内に未達`}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MODULE: 報告サマリー =====
function SummaryModule({ settings, negotiations, org }) {
  const active = org.totalHeadcount - org.standbyCount;
  const utilRate = (active / org.totalHeadcount) * 100;
  const monthlyCost = org.standbyCount * org.avgStandbyCost;
  const minReq = Math.ceil(org.totalHeadcount * settings.targetUtilizationRate / 100);
  const resignRate = (org.currentResignations / org.totalHeadcount) * 100;
  const rateMax = Math.floor(org.totalHeadcount * settings.targetResignationRate / 100);

  const totalBase = negotiations.reduce((a, n) => a + (n.currentRate || 0), 0);
  const done = negotiations.filter(n => n.status === '完了');
  const agreed = negotiations.filter(n => n.status === '合意済み' || n.status === '完了');
  const doneImprove = done.reduce((a, n) => a + ((n.negotiatedRate || 0) - n.currentRate), 0);
  const agreedImprove = agreed.reduce((a, n) => a + ((n.negotiatedRate || 0) - n.currentRate), 0);
  const donePct = totalBase > 0 ? (doneImprove / totalBase) * 100 : 0;
  const agreedPct = totalBase > 0 ? (agreedImprove / totalBase) * 100 : 0;
  const annualDone = doneImprove * settings.remainingMonths;
  const annualTarget = totalBase * settings.targetIncreaseRate / 100 * settings.remainingMonths;

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  const KPIRow = ({ label, cur, target, good, note }) => (
    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
      <td style={{ padding: '10px 14px', fontSize: 13, color: '#334155' }}>{label}</td>
      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: good ? '#16a34a' : '#dc2626' }}>{cur}</td>
      <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: '#94a3b8' }}>{target}</td>
      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 16 }}>{good ? '✓' : '✗'}</td>
      <td style={{ padding: '10px 14px', fontSize: 11, color: '#94a3b8' }}>{note}</td>
    </tr>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>KGI / KPI 報告サマリー</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{settings.fiscalYear}　作成日: {today}　残{settings.remainingMonths}ヶ月</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ background: '#1e293b', color: '#fff', padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>KGI：売上高に直結する主要指標</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['指標', '現在値', '目標', '判定', '備考'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: h === '現在値' ? 'right' : h === '目標' ? 'right' : h === '判定' ? 'center' : 'left', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <KPIRow label="稼働率" cur={pct(utilRate)} target={`${settings.targetUtilizationRate}%`} good={utilRate >= settings.targetUtilizationRate} note={`待機${org.standbyCount}名 ／ 月次損失: ${yen(monthlyCost)}`} />
            <KPIRow label="単価交渉達成率（完了）" cur={pct(donePct)} target={`${settings.targetIncreaseRate}%`} good={donePct >= settings.targetIncreaseRate} note={`月次粗利改善: ${yen(doneImprove)} ／ 通期: ${yen(annualDone)}`} />
            <KPIRow label="単価交渉達成率（合意含む）" cur={pct(agreedPct)} target={`${settings.targetIncreaseRate}%`} good={agreedPct >= settings.targetIncreaseRate} note={`見込み月次改善: ${yen(agreedImprove)}`} />
            <KPIRow label="離職率（通期）" cur={pct(resignRate)} target={`${settings.targetResignationRate}%以下`} good={resignRate <= settings.targetResignationRate} note={`現在${org.currentResignations}名 ／ 許容残り${Math.max(0, rateMax - org.currentResignations)}名`} />
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>ギャップ分析</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#fff1f2', borderRadius: 6, padding: '10px 14px', border: '1px solid #fecdd3' }}>
              <div style={{ fontSize: 11, color: '#9f1239', fontWeight: 500 }}>単価交渉 月次不足額</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>{yen(Math.max(0, totalBase * settings.targetIncreaseRate / 100 - doneImprove))}</div>
              <div style={{ fontSize: 11, color: '#f87171' }}>通期不足: {yen(Math.max(0, annualTarget - annualDone))}</div>
            </div>
            <div style={{ background: org.standbyCount > 0 ? '#fff1f2' : '#f0fdf4', borderRadius: 6, padding: '10px 14px', border: `1px solid ${org.standbyCount > 0 ? '#fecdd3' : '#bbf7d0'}` }}>
              <div style={{ fontSize: 11, color: org.standbyCount > 0 ? '#9f1239' : '#166534', fontWeight: 500 }}>待機コスト（月次）</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: org.standbyCount > 0 ? '#dc2626' : '#16a34a', fontFamily: 'monospace' }}>{yen(monthlyCost)}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>95%達成まで {Math.max(0, minReq - active)}名配属が必要</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>単価交渉 ステータス内訳</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {STATUS_LIST.map(s => {
              const cnt = negotiations.filter(n => n.status === s).length;
              return (
                <div key={s} style={{ background: STATUS_CFG[s].bg, borderRadius: 6, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: STATUS_CFG[s].fg, fontFamily: 'monospace' }}>{cnt}</div>
                  <div style={{ fontSize: 11, color: STATUS_CFG[s].fg, opacity: 0.8 }}>{s}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
            <span>合計 {negotiations.length}件</span>
            <span>完了+合意: {agreed.length}件 ({pct(agreed.length / negotiations.length * 100, 0)})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MODULE: 設定 =====
function SettingsModule({ settings, setSettings, org, setOrg }) {
  const [ls, setLs] = useState(settings);
  const [lo, setLo] = useState(org);
  const [saved, setSaved] = useState(false);
  const save = () => { setSettings(ls); setOrg(lo); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  return (
    <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[
        { title: '目標値', items: [{ label: '通期単価アップ目標', key: 'targetIncreaseRate', unit: '%' }, { label: '目標稼働率', key: 'targetUtilizationRate', unit: '%' }, { label: '目標離職率（上限）', key: 'targetResignationRate', unit: '%' }, { label: '残り月数', key: 'remainingMonths', unit: 'ヶ月' }], data: ls, set: setLs },
        { title: '組織データ', items: [{ label: '所属人数', key: 'totalHeadcount', unit: '名' }, { label: '待機人数', key: 'standbyCount', unit: '名' }, { label: '離職人数（通期）', key: 'currentResignations', unit: '名' }, { label: '1人あたり月次待機コスト', key: 'avgStandbyCost', unit: '円' }], data: lo, set: setLo },
      ].map(({ title, items, data, set }) => (
        <div key={title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>{title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(({ label, key, unit }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: '#64748b', width: 200 }}>{label}</label>
                <input type="number" value={data[key]} onChange={e => set({ ...data, [key]: Number(e.target.value) })}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: 110, fontFamily: 'monospace', textAlign: 'right' }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{unit}</span>
              </div>
            ))}
            {data === ls && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: '#64748b', width: 200 }}>年度表示</label>
                <input type="text" value={ls.fiscalYear} onChange={e => setLs({ ...ls, fiscalYear: e.target.value })}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: 130 }} />
              </div>
            )}
          </div>
        </div>
      ))}
      <div>
        <button onClick={save} style={{ background: saved ? '#16a34a' : '#1e293b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background .3s' }}>
          {saved ? '✓ 保存しました' : '設定を保存'}
        </button>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
const TABS = [
  { label: '単価交渉', icon: '📈' },
  { label: '稼働率',   icon: '⚙️' },
  { label: '離職管理', icon: '👥' },
  { label: '回収シミュ', icon: '💰' },
  { label: '報告サマリー', icon: '📋' },
  { label: '設定',     icon: '⚙' },
];

export default function App() {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [negotiations, setNegotiations] = useState(SEED_NEG);
  const [org, setOrg] = useState(DEFAULT_ORG);

  useEffect(() => {
    (async () => {
      const s = await store.get('settings'); if (s) setSettings(s);
      const n = await store.get('negotiations'); if (n) setNegotiations(n);
      const o = await store.get('org'); if (o) setOrg(o);
    })();
  }, []);

  const saveSettings = async (v) => { setSettings(v); await store.set('settings', v); };
  const saveNeg = async (v) => { setNegotiations(v); await store.set('negotiations', v); };
  const saveOrg = async (v) => { setOrg(v); await store.set('org', v); };

  // Global metrics
  const active = org.totalHeadcount - org.standbyCount;
  const utilRate = (active / org.totalHeadcount) * 100;
  const monthlyCost = org.standbyCount * org.avgStandbyCost;
  const totalBase = negotiations.reduce((a, n) => a + (n.currentRate || 0), 0);
  const done = negotiations.filter(n => n.status === '完了');
  const donePct = totalBase > 0 ? (done.reduce((a, n) => a + ((n.negotiatedRate || 0) - n.currentRate), 0) / totalBase) * 100 : 0;
  const resignRate = (org.currentResignations / org.totalHeadcount) * 100;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, height: 52 }}>
          <div>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '0.02em' }}>営業管理ダッシュボード</span>
            <span style={{ color: '#475569', fontSize: 11, marginLeft: 10 }}>{settings.fiscalYear} ／ 残{settings.remainingMonths}ヶ月</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 24, fontSize: 11 }}>
            <span style={{ color: '#64748b' }}>稼働率 <span style={{ color: utilRate >= settings.targetUtilizationRate ? '#4ade80' : '#f87171', fontWeight: 700, fontFamily: 'monospace' }}>{pct(utilRate)}</span></span>
            <span style={{ color: '#64748b' }}>単価達成 <span style={{ color: donePct >= settings.targetIncreaseRate ? '#4ade80' : '#fbbf24', fontWeight: 700, fontFamily: 'monospace' }}>{pct(donePct)}</span><span style={{ color: '#475569' }}> / {settings.targetIncreaseRate}%目標</span></span>
            <span style={{ color: '#64748b' }}>待機コスト <span style={{ color: '#f87171', fontWeight: 700, fontFamily: 'monospace' }}>{yen(monthlyCost)}/月</span></span>
            <span style={{ color: '#64748b' }}>離職率 <span style={{ color: resignRate <= settings.targetResignationRate ? '#4ade80' : '#f87171', fontWeight: 700, fontFamily: 'monospace' }}>{pct(resignRate)}</span></span>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 0 }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px', fontSize: 12, fontWeight: tab === i ? 600 : 400, color: tab === i ? '#fff' : '#64748b', borderBottom: tab === i ? '2px solid #3b82f6' : '2px solid transparent', transition: 'all .15s', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
        {tab === 0 && <NegotiationModule negotiations={negotiations} setNegotiations={saveNeg} settings={settings} />}
        {tab === 1 && <UtilizationModule org={org} setOrg={saveOrg} settings={settings} />}
        {tab === 2 && <ResignationModule org={org} setOrg={saveOrg} settings={settings} />}
        {tab === 3 && <RecoveryModule org={org} settings={settings} totalCurrentBase={totalBase} />}
        {tab === 4 && <SummaryModule settings={settings} negotiations={negotiations} org={org} />}
        {tab === 5 && <SettingsModule settings={settings} setSettings={saveSettings} org={org} setOrg={saveOrg} />}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";

// ===== FORMATTERS =====
const yen = (n) => (n != null && !isNaN(n)) ? `¥${Math.round(n).toLocaleString('ja-JP')}` : '—';
const pct = (n, d = 1) => (n != null && !isNaN(n)) ? `${n.toFixed(d)}%` : '—';

// ===== DESIGN TOKENS (Facebook-inspired + #F6AB00 accent) =====
const T = {
  // Surfaces
  bg: '#F0F2F5',
  card: '#FFFFFF',
  headerBg: '#FFFFFF',
  // Accent
  accent: '#F6AB00',
  accentHover: '#E09D00',
  accentLight: '#FFF8E7',
  accentBorder: '#FFE0A0',
  // Text
  text1: '#050505',
  text2: '#65676B',
  text3: '#8A8D91',
  textOnAccent: '#FFFFFF',
  // Borders & Dividers
  divider: '#E4E6EB',
  inputBorder: '#CED0D4',
  // Semantic
  good: '#31A24C',
  goodBg: '#E7F6EC',
  goodBorder: '#B7E4C7',
  bad: '#E4002B',
  badBg: '#FFECE9',
  badBorder: '#FFCDC7',
  warn: '#F7B928',
  warnBg: '#FFF8E7',
  warnBorder: '#FFE0A0',
  blue: '#1877F2',
  blueBg: '#E7F3FF',
  blueBorder: '#B6D4FE',
  // Shadows
  shadow: '0 1px 2px rgba(0,0,0,0.1)',
  shadowHover: '0 2px 8px rgba(0,0,0,0.12)',
  shadowHeader: '0 2px 4px rgba(0,0,0,0.08)',
  // Radius
  r: 8,
  rPill: 20,
  // Font
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
};

// ===== CONSTANTS =====
const STATUS_LIST = ['未着手', '交渉中', '合意済み', '完了'];
const STATUS_CFG = {
  '未着手': { bg: '#F0F2F5', fg: '#65676B', dot: '#8A8D91' },
  '交渉中': { bg: T.blueBg, fg: T.blue, dot: T.blue },
  '合意済み': { bg: T.accentLight, fg: '#B8860B', dot: T.accent },
  '完了':   { bg: T.goodBg, fg: T.good, dot: T.good },
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

// ===== CARD WRAPPER =====
const Card = ({ children, style, noPad }) => (
  <div style={{ background: T.card, borderRadius: T.r, boxShadow: T.shadow, padding: noPad ? 0 : 16, ...style }}>
    {children}
  </div>
);

const CardHeader = ({ children, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${T.divider}` }}>
    <span style={{ fontSize: 15, fontWeight: 600, color: T.text1 }}>{children}</span>
    {right}
  </div>
);

// ===== SMALL COMPONENTS =====
const StatusBadge = ({ s }) => (
  <span style={{ background: STATUS_CFG[s]?.bg, color: STATUS_CFG[s]?.fg, padding: '4px 10px', borderRadius: T.rPill, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_CFG[s]?.dot, flexShrink: 0 }} />
    {s}
  </span>
);

const KpiCard = ({ label, value, sub, status = 'neutral' }) => {
  const colors = {
    good:    [T.goodBg, T.good, T.goodBorder],
    bad:     [T.badBg, T.bad, T.badBorder],
    warn:    [T.warnBg, '#92400E', T.warnBorder],
    neutral: [T.card, T.text1, T.divider],
    blue:    [T.blueBg, T.blue, T.blueBorder],
  };
  const [bg, fg, border] = colors[status] || colors.neutral;
  return (
    <div style={{ background: bg, borderRadius: T.r, padding: '16px 18px', boxShadow: T.shadow }}>
      <div style={{ fontSize: 12, color: T.text2, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: fg, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.text3, marginTop: 6 }}>{sub}</div>}
    </div>
  );
};

const Bar = ({ value, max, color = T.accent, h = 8 }) => (
  <div style={{ background: T.divider, borderRadius: 99, height: h, overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .4s ease' }} />
  </div>
);

const Inp = ({ value, onChange, type = 'text', placeholder = '' }) => (
  <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, width: '100%', outline: 'none', background: '#F0F2F5', transition: 'border-color .2s, background .2s' }}
    onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.background = '#fff'; }}
    onBlur={e => { e.target.style.borderColor = T.inputBorder; e.target.style.background = '#F0F2F5'; }} />
);

const Sel = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, width: '100%', outline: 'none', background: '#F0F2F5', cursor: 'pointer' }}>
    {options.map(o => <option key={o}>{o}</option>)}
  </select>
);

const Btn = ({ onClick, children, variant = 'primary', small = false }) => {
  const styles = {
    primary: { background: T.accent, color: T.textOnAccent, border: 'none' },
    ghost:   { background: '#E4E6EB', color: T.text1, border: 'none' },
    danger:  { background: T.badBg, color: T.bad, border: 'none' },
    success: { background: T.goodBg, color: T.good, border: 'none' },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], borderRadius: small ? 6 : T.rPill, padding: small ? '5px 12px' : '8px 18px', fontSize: small ? 12 : 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'filter .15s' }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.93)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
      {children}
    </button>
  );
};

// ===== TABLE HELPERS =====
const TH = ({ children, align = 'left', style: s }) => (
  <th style={{ padding: '10px 14px', textAlign: align, fontSize: 12, color: T.text3, fontWeight: 600, whiteSpace: 'nowrap', background: '#FAFBFC', ...s }}>{children}</th>
);

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const trHover = (e, enter) => { e.currentTarget.style.background = enter ? '#F7F8FA' : ''; };

// ===== GAUGE =====
const Gauge = ({ value, target, size = 150 }) => {
  const r = 52, cx = 75, cy = 75;
  const C = 2 * Math.PI * r;
  const cap = Math.max(target * 1.1, 100);
  const vPct = Math.min(value, cap) / cap;
  const tPct = target / cap;
  const color = value >= target ? T.good : value >= target - 5 ? T.accent : T.bad;
  return (
    <svg width={size} height={size} viewBox="0 0 150 150">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.divider} strokeWidth={14} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={14}
        strokeDasharray={C} strokeDashoffset={C * (1 - vPct)}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <line x1={cx} y1={cy - r + 4} x2={cx} y2={cy - r - 4} stroke={T.bad} strokeWidth={3}
        transform={`rotate(${tPct * 360} ${cx} ${cy})`} strokeLinecap="round" />
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={22} fontWeight={700} fill={color} fontFamily="system-ui">{value.toFixed(1)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill={T.text3}>% 稼働率</text>
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize={9} fill={T.text3}>目標 {target}%</text>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="完了済み単価アップ率" value={pct(donePct)} sub={`目標: ${settings.targetIncreaseRate}%`} status={donePct >= settings.targetIncreaseRate ? 'good' : donePct >= settings.targetIncreaseRate * 0.5 ? 'warn' : 'bad'} />
        <KpiCard label="目標との差分" value={pct(Math.max(0, settings.targetIncreaseRate - donePct))} sub={`月次不足: ${yen(Math.max(0, gapMonthly))}`} status={gapMonthly <= 0 ? 'good' : 'bad'} />
        <KpiCard label="月次粗利改善（完了）" value={yen(doneImprove)} sub={`合意含む見込: ${yen(agreedImprove)}`} status="blue" />
        <KpiCard label="通期粗利改善見込み" value={yen(annualDone)} sub={`目標: ${yen(annualTarget)}`} status={annualDone >= annualTarget ? 'good' : 'neutral'} />
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.text1 }}>交渉進捗率（対全体単価）</span>
          <span style={{ fontSize: 12, color: T.text3 }}>{done.length}/{negotiations.length}件 完了</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: T.text2, marginBottom: 8 }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: T.good, marginRight: 4, verticalAlign: 'middle' }} />完了: {pct(donePct)}</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: T.accent, marginRight: 4, verticalAlign: 'middle' }} />合意含む: {pct(agreedPct)}</span>
          <span style={{ marginLeft: 'auto', color: T.bad }}>目標ライン: {settings.targetIncreaseRate}%</span>
        </div>
        <div style={{ position: 'relative', height: 14, background: T.divider, borderRadius: 99, overflow: 'visible' }}>
          <div style={{ position: 'absolute', height: '100%', width: `${Math.min(100, agreedPct / (settings.targetIncreaseRate * 1.3) * 100)}%`, background: T.accent, borderRadius: 99, opacity: 0.4 }} />
          <div style={{ position: 'absolute', height: '100%', width: `${Math.min(100, donePct / (settings.targetIncreaseRate * 1.3) * 100)}%`, background: T.good, borderRadius: 99 }} />
          <div style={{ position: 'absolute', top: -4, bottom: -4, width: 2, background: T.bad, left: `${(settings.targetIncreaseRate / (settings.targetIncreaseRate * 1.3)) * 100}%`, borderRadius: 1 }} />
        </div>
      </Card>

      <Card noPad>
        <CardHeader right={<Btn onClick={() => setAdding(!adding)} small>＋ 追加</Btn>}>交渉一覧</CardHeader>

        {adding && (
          <div style={{ background: '#FAFBFC', borderBottom: `1px solid ${T.divider}`, padding: '10px 16px', display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr 1.5fr auto', gap: 8, alignItems: 'center' }}>
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
          <table style={tableStyle}>
            <thead>
              <tr>
                {['技術者名', '顧客', '現在単価', '交渉後単価', 'アップ率', '月次改善額', 'ステータス', ''].map(h => (
                  <TH key={h} align={h === '技術者名' || h === '顧客' ? 'left' : 'right'} style={h === '' ? { width: 60 } : {}}>{h}</TH>
                ))}
              </tr>
            </thead>
            <tbody>
              {negotiations.map(n => {
                const upRate = n.negotiatedRate ? ((n.negotiatedRate - n.currentRate) / n.currentRate) * 100 : null;
                const improve = n.negotiatedRate ? n.negotiatedRate - n.currentRate : null;
                const isEdit = editId === n.id;
                return (
                  <tr key={n.id} style={{ borderTop: `1px solid ${T.divider}` }} onMouseEnter={e => trHover(e, true)} onMouseLeave={e => trHover(e, false)}>
                    {isEdit ? (
                      <>
                        <td style={{ padding: '8px 14px' }}><Inp value={editData.techName} onChange={v => setEditData({ ...editData, techName: v })} /></td>
                        <td style={{ padding: '8px 14px' }}><Inp value={editData.customerName} onChange={v => setEditData({ ...editData, customerName: v })} /></td>
                        <td style={{ padding: '8px 14px' }}><Inp value={editData.currentRate} onChange={v => setEditData({ ...editData, currentRate: v })} type="number" /></td>
                        <td style={{ padding: '8px 14px' }}><Inp value={editData.negotiatedRate || ''} onChange={v => setEditData({ ...editData, negotiatedRate: v })} type="number" /></td>
                        <td colSpan={2} />
                        <td style={{ padding: '8px 14px' }}><Sel value={editData.status} onChange={v => setEditData({ ...editData, status: v })} options={STATUS_LIST} /></td>
                        <td style={{ padding: '8px 14px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Btn onClick={confirmEdit} variant="success" small>✓</Btn>
                            <Btn onClick={() => setEditId(null)} variant="ghost" small>✕</Btn>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px 14px', color: T.text1, fontWeight: 500 }}>{n.techName}</td>
                        <td style={{ padding: '10px 14px', color: T.text2 }}>{n.customerName}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: T.text1 }}>{yen(n.currentRate)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: T.text1 }}>{n.negotiatedRate ? yen(n.negotiatedRate) : <span style={{ color: T.text3 }}>—</span>}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {upRate != null ? <span style={{ color: upRate >= settings.targetIncreaseRate ? T.good : T.blue, fontWeight: 600 }}>{pct(upRate)}</span> : <span style={{ color: T.text3 }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: T.accent, fontWeight: 600 }}>
                          {improve != null ? `+${yen(improve)}` : <span style={{ color: T.text3 }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}><StatusBadge s={n.status} /></td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditId(n.id); setEditData({ ...n }); }} style={{ background: '#E4E6EB', border: 'none', cursor: 'pointer', color: T.text2, fontSize: 13, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏</button>
                            <button onClick={() => del(n.id)} style={{ background: T.badBg, border: 'none', cursor: 'pointer', color: T.bad, fontSize: 13, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#FAFBFC', borderTop: `2px solid ${T.divider}` }}>
                <td style={{ padding: '10px 14px', fontSize: 12, color: T.text2, fontWeight: 600 }} colSpan={2}>合計 {negotiations.length}件</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600, color: T.text1 }}>{yen(totalBase)}</td>
                <td colSpan={2} />
                <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600, color: T.accent }}>+{yen(doneImprove)}/月</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="現在稼働率" value={pct(rate)} sub={`目標: ${settings.targetUtilizationRate}%`} status={rate >= settings.targetUtilizationRate ? 'good' : gap > 5 ? 'bad' : 'warn'} />
        <KpiCard label="稼働 / 所属" value={`${active}名 / ${org.totalHeadcount}名`} sub={`待機: ${org.standbyCount}名`} status="blue" />
        <KpiCard label="月次待機コスト" value={yen(monthlyCost)} sub={`年間: ${yen(monthlyCost * 12)}`} status={org.standbyCount > 0 ? 'bad' : 'good'} />
        <KpiCard label="95%達成に必要" value={`配属 ${needed}名`} sub={`最低稼働必要: ${minReq}名`} status={needed === 0 ? 'good' : 'warn'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text2, marginBottom: 12 }}>稼働率ゲージ</div>
          <Gauge value={rate} target={settings.targetUtilizationRate} size={160} />
          {gap > 0 && <div style={{ marginTop: 8, fontSize: 12, color: T.bad, fontWeight: 600, textAlign: 'center' }}>目標まで {pct(gap)} 不足<br /><span style={{ fontSize: 11, fontWeight: 400, color: T.text3 }}>あと {needed}名 配属が必要</span></div>}
        </Card>

        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 16 }}>データ更新</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[{ label: '所属人数', key: 'totalHeadcount', unit: '名' }, { label: '待機人数', key: 'standbyCount', unit: '名' }, { label: '1人あたり月次待機コスト', key: 'avgStandbyCost', unit: '円' }].map(({ label, key, unit }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 13, color: T.text2, width: 200 }}>{label}</label>
                <input type="number" value={org[key]} onChange={e => setOrg({ ...org, [key]: Number(e.target.value) })}
                  style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 6, padding: '8px 12px', fontSize: 14, width: 120, fontVariantNumeric: 'tabular-nums', textAlign: 'right', background: '#F0F2F5', outline: 'none' }} />
                <span style={{ fontSize: 12, color: T.text3 }}>{unit}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card noPad>
        <CardHeader>配属シナリオ別シミュレーション</CardHeader>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['追加配属数', '稼働率', '残待機人数', '月次待機コスト', '月次コスト削減', '判定'].map(h => (
                <TH key={h} align={h === '追加配属数' ? 'left' : h === '判定' ? 'center' : 'right'}>{h}</TH>
              ))}
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${T.divider}`, background: s.rate >= settings.targetUtilizationRate ? T.goodBg : '' }} onMouseEnter={e => trHover(e, true)} onMouseLeave={e => trHover(e, false)}>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>+{s.place}名</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: s.rate >= settings.targetUtilizationRate ? T.good : T.bad }}>{pct(s.rate)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: T.text2 }}>{s.standby}名</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: T.bad }}>{yen(s.cost)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: T.good }}>+{yen(s.saving)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: s.rate >= settings.targetUtilizationRate ? T.good : T.text3 }}>
                  {s.rate >= settings.targetUtilizationRate ? '✓ 目標達成' : '未達'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
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
    bad: `目標離職率 ${settings.targetResignationRate}% を超過しています。即時対策が必要です。`,
    warn: `残り ${remaining}名で目標上限に達します。注意が必要です。`,
    good: `目標範囲内です。あと ${remaining}名まで許容できます。`,
  };
  const alertStyle = {
    bad:  { background: T.badBg, color: T.bad, borderLeft: `4px solid ${T.bad}` },
    warn: { background: T.warnBg, color: '#92400E', borderLeft: `4px solid ${T.accent}` },
    good: { background: T.goodBg, color: T.good, borderLeft: `4px solid ${T.good}` },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KpiCard label="現在離職人数（通期）" value={`${org.currentResignations}名`} sub={`離職率: ${pct(currentRate)}`} status={currentRate > settings.targetResignationRate ? 'bad' : 'good'} />
        <KpiCard label="目標最大離職数" value={`${rateMax}名`} sub={`目標離職率: ${settings.targetResignationRate}%`} status="neutral" />
        <KpiCard label="追加許容離職数" value={`あと ${Math.max(0, remaining)}名`} sub={remaining <= 0 ? '超過中' : '予算達成ライン'} status={level} />
        <KpiCard label="稼働維持の許容数" value={`あと ${allowableByUtil}名`} sub={`稼働率${settings.targetUtilizationRate}%維持ライン`} status={allowableByUtil <= 0 ? 'bad' : allowableByUtil <= 3 ? 'warn' : 'good'} />
      </div>

      <div style={{ borderRadius: T.r, padding: '14px 18px', fontSize: 14, fontWeight: 500, ...alertStyle[level] }}>
        {msgs[level]}
      </div>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 12 }}>離職進捗（対目標上限）</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.text3, marginBottom: 8 }}>
          <span>現在: {org.currentResignations}名 ({pct(currentRate)})</span>
          <span>目標上限: {rateMax}名 ({settings.targetResignationRate}%)</span>
        </div>
        <Bar value={org.currentResignations} max={rateMax} color={level === 'bad' ? T.bad : level === 'warn' ? T.accent : T.good} h={16} />
        <div style={{ fontSize: 12, color: T.text3, marginTop: 8, textAlign: 'center' }}>{org.currentResignations} / {rateMax}名</div>
      </Card>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 16 }}>データ更新</div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[{ label: '所属人数', key: 'totalHeadcount', unit: '名' }, { label: '離職人数（通期実績）', key: 'currentResignations', unit: '名' }].map(({ label, key, unit }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 13, color: T.text2, width: 160 }}>{label}</label>
              <input type="number" value={org[key]} onChange={e => setOrg({ ...org, [key]: Number(e.target.value) })}
                style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 6, padding: '8px 12px', fontSize: 14, width: 90, fontVariantNumeric: 'tabular-nums', textAlign: 'right', background: '#F0F2F5', outline: 'none' }} />
              <span style={{ fontSize: 12, color: T.text3 }}>{unit}</span>
            </div>
          ))}
        </div>
      </Card>
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

  const sliderStyle = { width: '100%', accentColor: T.accent, height: 6, cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KpiCard label="月次待機コスト（損失）" value={yen(monthlyCost)} sub={`待機 ${org.standbyCount}名`} status="bad" />
        <KpiCard label="累積損失額" value={yen(totalLoss)} sub={`${lossMonths}ヶ月分`} status="bad" />
        <KpiCard label="回収目標期間" value={`${recoveryTarget}ヶ月`} sub="設定した期間内で回収" status="blue" />
      </div>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 16 }}>シミュレーション設定</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[{ label: `損失発生月数: ${lossMonths}ヶ月`, val: lossMonths, set: setLossMonths, min: 1, max: 12 }, { label: `回収目標期間: ${recoveryTarget}ヶ月`, val: recoveryTarget, set: setRecoveryTarget, min: 1, max: 24 }].map(({ label, val, set, min, max }) => (
            <div key={label}>
              <div style={{ fontSize: 13, color: T.text2, marginBottom: 8 }}>{label}</div>
              <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))} style={sliderStyle} />
            </div>
          ))}
        </div>
      </Card>

      <Card noPad>
        <CardHeader>プリセットシナリオ</CardHeader>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['シナリオ', '単価アップ', '新規配属', '月次改善額', '回収期間', '判定'].map(h => (
                <TH key={h} align={h === 'シナリオ' ? 'left' : h === '判定' ? 'center' : 'right'}>{h}</TH>
              ))}
            </tr>
          </thead>
          <tbody>
            {presets.map((p, i) => {
              const s = calcScenario(p.rateUp, p.place);
              return (
                <tr key={i} style={{ borderTop: `1px solid ${T.divider}`, background: s.ok ? T.goodBg : '' }} onMouseEnter={e => trHover(e, true)} onMouseLeave={e => trHover(e, false)}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: T.text1 }}>{p.label}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: T.text2 }}>+{p.rateUp}% ({yen(s.rGain)}/月)</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: T.text2 }}>+{p.place}名</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: T.accent }}>{yen(s.total)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: s.ok ? T.good : T.text2 }}>{s.months < 999 ? `${s.months}ヶ月` : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: s.ok ? T.good : T.text3 }}>{s.ok ? '✓ 達成' : '未達'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: '10px 16px', fontSize: 12, color: T.text3, borderTop: `1px solid ${T.divider}` }}>※ 新規配属は粗利率30%で計算。単価改善は全技術者の現在単価合計を基準に算出。</div>
      </Card>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 16 }}>カスタムシミュレーション</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 16 }}>
          {[{ label: `単価アップ率: ${customRate}%`, val: customRate, set: setCustomRate, min: 0, max: 20 }, { label: `新規配属数: ${customPlace}名`, val: customPlace, set: setCustomPlace, min: 0, max: 60 }].map(({ label, val, set, min, max }) => (
            <div key={label}>
              <div style={{ fontSize: 13, color: T.text2, marginBottom: 8 }}>{label}</div>
              <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))} style={sliderStyle} />
            </div>
          ))}
        </div>
        <div style={{ borderRadius: T.r, padding: '14px 18px', background: custom.ok ? T.goodBg : '#FAFBFC', boxShadow: 'inset 0 0 0 1px ' + (custom.ok ? T.goodBorder : T.divider) }}>
          <div style={{ display: 'flex', gap: 32, fontSize: 14 }}>
            <div><span style={{ color: T.text3, fontSize: 12 }}>月次改善額</span><br /><span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: T.accent }}>{yen(custom.total)}</span></div>
            <div><span style={{ color: T.text3, fontSize: 12 }}>回収期間</span><br /><span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: custom.ok ? T.good : T.text1 }}>{custom.months < 999 ? `${custom.months}ヶ月` : '—'}</span></div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}><span style={{ fontWeight: 700, fontSize: 15, color: custom.ok ? T.good : T.text3 }}>{custom.ok ? `✓ 目標 ${recoveryTarget}ヶ月以内に回収可能` : `目標 ${recoveryTarget}ヶ月内に未達`}</span></div>
          </div>
        </div>
      </Card>
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
    <tr style={{ borderTop: `1px solid ${T.divider}` }} onMouseEnter={e => trHover(e, true)} onMouseLeave={e => trHover(e, false)}>
      <td style={{ padding: '12px 14px', fontSize: 13, color: T.text1 }}>{label}</td>
      <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 15, color: good ? T.good : T.bad }}>{cur}</td>
      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: T.text3 }}>{target}</td>
      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: good ? T.goodBg : T.badBg, color: good ? T.good : T.bad, fontSize: 14, fontWeight: 700 }}>{good ? '✓' : '✗'}</span>
      </td>
      <td style={{ padding: '12px 14px', fontSize: 12, color: T.text3 }}>{note}</td>
    </tr>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text1 }}>KGI / KPI 報告サマリー</div>
          <div style={{ fontSize: 13, color: T.text3, marginTop: 4 }}>{settings.fiscalYear}　作成日: {today}　残{settings.remainingMonths}ヶ月</div>
        </div>
      </div>

      <Card noPad>
        <div style={{ background: T.accent, color: T.textOnAccent, padding: '12px 16px', fontSize: 13, fontWeight: 700, borderRadius: `${T.r}px ${T.r}px 0 0` }}>KGI：売上高に直結する主要指標</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              {['指標', '現在値', '目標', '判定', '備考'].map(h => (
                <TH key={h} align={h === '現在値' || h === '目標' ? 'right' : h === '判定' ? 'center' : 'left'}>{h}</TH>
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
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 14 }}>ギャップ分析</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: T.badBg, borderRadius: T.r, padding: '14px 16px', borderLeft: `4px solid ${T.bad}` }}>
              <div style={{ fontSize: 12, color: T.bad, fontWeight: 500 }}>単価交渉 月次不足額</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.bad, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{yen(Math.max(0, totalBase * settings.targetIncreaseRate / 100 - doneImprove))}</div>
              <div style={{ fontSize: 12, color: T.bad, opacity: 0.7, marginTop: 2 }}>通期不足: {yen(Math.max(0, annualTarget - annualDone))}</div>
            </div>
            <div style={{ background: org.standbyCount > 0 ? T.badBg : T.goodBg, borderRadius: T.r, padding: '14px 16px', borderLeft: `4px solid ${org.standbyCount > 0 ? T.bad : T.good}` }}>
              <div style={{ fontSize: 12, color: org.standbyCount > 0 ? T.bad : T.good, fontWeight: 500 }}>待機コスト（月次）</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: org.standbyCount > 0 ? T.bad : T.good, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{yen(monthlyCost)}</div>
              <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>95%達成まで {Math.max(0, minReq - active)}名配属が必要</div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 14 }}>単価交渉 ステータス内訳</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {STATUS_LIST.map(s => {
              const cnt = negotiations.filter(n => n.status === s).length;
              return (
                <div key={s} style={{ background: STATUS_CFG[s].bg, borderRadius: T.r, padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: STATUS_CFG[s].fg, fontVariantNumeric: 'tabular-nums' }}>{cnt}</div>
                  <div style={{ fontSize: 12, color: STATUS_CFG[s].fg, opacity: 0.8, marginTop: 2 }}>{s}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.text3, borderTop: `1px solid ${T.divider}`, paddingTop: 12 }}>
            <span>合計 {negotiations.length}件</span>
            <span>完了+合意: {agreed.length}件 ({pct(agreed.length / negotiations.length * 100, 0)})</span>
          </div>
        </Card>
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
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[
        { title: '目標値', items: [{ label: '通期単価アップ目標', key: 'targetIncreaseRate', unit: '%' }, { label: '目標稼働率', key: 'targetUtilizationRate', unit: '%' }, { label: '目標離職率（上限）', key: 'targetResignationRate', unit: '%' }, { label: '残り月数', key: 'remainingMonths', unit: 'ヶ月' }], data: ls, set: setLs },
        { title: '組織データ', items: [{ label: '所属人数', key: 'totalHeadcount', unit: '名' }, { label: '待機人数', key: 'standbyCount', unit: '名' }, { label: '離職人数（通期）', key: 'currentResignations', unit: '名' }, { label: '1人あたり月次待機コスト', key: 'avgStandbyCost', unit: '円' }], data: lo, set: setLo },
      ].map(({ title, items, data, set }) => (
        <Card key={title}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text1, marginBottom: 16 }}>{title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map(({ label, key, unit }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 13, color: T.text2, width: 200 }}>{label}</label>
                <input type="number" value={data[key]} onChange={e => set({ ...data, [key]: Number(e.target.value) })}
                  style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 6, padding: '8px 12px', fontSize: 14, width: 110, fontVariantNumeric: 'tabular-nums', textAlign: 'right', background: '#F0F2F5', outline: 'none' }} />
                <span style={{ fontSize: 12, color: T.text3 }}>{unit}</span>
              </div>
            ))}
            {data === ls && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 13, color: T.text2, width: 200 }}>年度表示</label>
                <input type="text" value={ls.fiscalYear} onChange={e => setLs({ ...ls, fiscalYear: e.target.value })}
                  style={{ border: `1px solid ${T.inputBorder}`, borderRadius: 6, padding: '8px 12px', fontSize: 14, width: 130, background: '#F0F2F5', outline: 'none' }} />
              </div>
            )}
          </div>
        </Card>
      ))}
      <div>
        <button onClick={save} style={{ background: saved ? T.good : T.accent, color: '#fff', border: 'none', borderRadius: T.rPill, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background .3s', boxShadow: T.shadow }}>
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

  const active = org.totalHeadcount - org.standbyCount;
  const utilRate = (active / org.totalHeadcount) * 100;
  const monthlyCost = org.standbyCount * org.avgStandbyCost;
  const totalBase = negotiations.reduce((a, n) => a + (n.currentRate || 0), 0);
  const done = negotiations.filter(n => n.status === '完了');
  const donePct = totalBase > 0 ? (done.reduce((a, n) => a + ((n.negotiatedRate || 0) - n.currentRate), 0) / totalBase) * 100 : 0;
  const resignRate = (org.currentResignations / org.totalHeadcount) * 100;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      {/* Header - Facebook-style white top bar */}
      <div style={{ background: T.headerBg, position: 'sticky', top: 0, zIndex: 100, boxShadow: T.shadowHeader }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, height: 56, padding: '0 24px', maxWidth: 1200, margin: '0 auto' }}>
          {/* Logo / Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: T.r, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 800 }}>Up</div>
            <div>
              <div style={{ color: T.text1, fontSize: 15, fontWeight: 700 }}>営業管理ダッシュボード</div>
              <div style={{ color: T.text3, fontSize: 11 }}>{settings.fiscalYear} ／ 残{settings.remainingMonths}ヶ月</div>
            </div>
          </div>

          {/* Header KPIs */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, fontSize: 12 }}>
            {[
              { label: '稼働率', value: pct(utilRate), ok: utilRate >= settings.targetUtilizationRate },
              { label: '単価達成', value: pct(donePct), ok: donePct >= settings.targetIncreaseRate },
              { label: '待機コスト', value: `${yen(monthlyCost)}/月`, ok: false },
              { label: '離職率', value: pct(resignRate), ok: resignRate <= settings.targetResignationRate },
            ].map(({ label, value, ok }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: T.text3 }}>{label}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ok ? T.good : label === '待機コスト' ? T.bad : T.accent }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs - Facebook-style pill tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px 0', maxWidth: 1200, margin: '0 auto' }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 20px', fontSize: 13,
              fontWeight: tab === i ? 600 : 400,
              color: tab === i ? T.accent : T.text2,
              borderBottom: tab === i ? `3px solid ${T.accent}` : '3px solid transparent',
              transition: 'all .15s', whiteSpace: 'nowrap',
              borderRadius: '4px 4px 0 0',
            }}
              onMouseEnter={e => { if (tab !== i) e.currentTarget.style.background = '#F0F2F5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
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

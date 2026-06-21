/* Katie English — Admin Portal UI kit: primitives + shell (blue accent) */

const A_ACCENT = '#4F9DFF';
const A_BG = 'rgba(79,157,255,0.12)';
const A_TEXT = '#60A5FA';
const SIDEBAR = '#0C1220';

function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 2, style = {} }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const node = ref.current;
    if (!node || !window.lucide) return;
    node.innerHTML = '';
    const i = document.createElement('i');
    i.setAttribute('data-lucide', name);
    node.appendChild(i);
    window.lucide.createIcons({ attrs: { width: size, height: size, 'stroke-width': strokeWidth } });
  });
  return <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center', color, ...style }} />;
}

function Btn({ children, variant = 'contained', onClick, style = {}, type = 'button', danger }) {
  const accent = danger ? '#FF7B7B' : A_ACCENT;
  const base = { fontFamily: 'Inter', fontWeight: 600, fontSize: 14, cursor: 'pointer', border: 'none', borderRadius: 8, padding: '9px 16px', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'opacity .15s, background .15s', ...style };
  const v = {
    contained: { background: accent, color: '#fff' },
    outline: { background: 'none', color: danger ? '#E11D48' : '#0F172A', boxShadow: `inset 0 0 0 1.5px ${danger ? '#FECACA' : '#E2E8F0'}` },
    text: { background: 'none', color: accent, padding: '6px 6px' },
  };
  return (
    <button type={type} onClick={onClick}
      onMouseEnter={(e) => { if (variant === 'contained') e.currentTarget.style.opacity = '0.9'; else e.currentTarget.style.background = '#F7F9FC'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; if (variant !== 'contained') e.currentTarget.style.background = 'none'; }}
      style={{ ...base, ...v[variant] }}>{children}</button>
  );
}

function Card({ children, style = {}, hover, onClick }) {
  return (
    <div onClick={onClick}
      onMouseEnter={hover ? (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,0.12)'; } : undefined}
      onMouseLeave={hover ? (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } : undefined}
      style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, transition: 'all .2s', cursor: onClick ? 'pointer' : 'default', ...style }}>{children}</div>
  );
}

function Chip({ children, bg = '#F1F5F9', color = '#64748B' }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'Inter', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: bg, color }}>{children}</span>;
}

const A_NAV = [
  { label: 'GENERAL', items: [
    { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { key: 'teachers', label: 'Teachers', icon: 'users' },
    { key: 'classes', label: 'Classes', icon: 'school' },
    { key: 'students', label: 'Students', icon: 'graduation-cap' },
    { key: 'homework', label: 'Homework', icon: 'file-text' },
  ] },
];

function AdminShell({ active, onNav, title, subtitle, children }) {
  const [menu, setMenu] = React.useState(false);
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 600, fontFamily: 'Inter', background: '#F7F9FC' }}>
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', background: SIDEBAR }}>
        <div style={{ padding: '28px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: A_ACCENT, color: '#fff', fontWeight: 900, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>K</div>
            <div><div style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>Katie English</div><div style={{ color: '#475569', fontSize: 10, letterSpacing: '0.05em', marginTop: 2 }}>Admin Portal</div></div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '0 12px' }}>
          {A_NAV.map((g, gi) => (
            <div key={gi}>
              <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', padding: '0 12px', marginBottom: 6 }}>{g.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {g.items.map((it) => {
                  const on = active === it.key;
                  return (
                    <div key={it.key} onClick={() => onNav(it.key)}
                      onMouseEnter={(e) => { if (!on) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#E2E8F0'; } }}
                      onMouseLeave={(e) => { if (!on) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8'; } }}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: on ? 700 : 500, color: on ? A_TEXT : '#94A3B8', background: on ? A_BG : 'none' }}>
                      <Icon name={it.icon} size={15} /> {it.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px 20px' }}><div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, fontSize: 10, color: '#475569', textAlign: 'center' }}>© Katie English</div></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '32px 32px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>Admin Portal <span style={{ opacity: 0.4 }}>›</span> <span style={{ opacity: 0.5, fontWeight: 500 }}>{title}</span></div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>{title}</div>
              {subtitle && <div style={{ fontSize: 14, color: '#64748B', marginTop: 8 }}>{subtitle}</div>}
            </div>
            <div style={{ position: 'relative', flexShrink: 0, marginTop: 4 }}>
              <button onClick={() => setMenu((v) => !v)} style={{ width: 36, height: 36, borderRadius: '50%', background: A_ACCENT, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>A</button>
              {menu && (
                <div style={{ position: 'absolute', right: 0, top: 44, width: 240, background: '#fff', borderRadius: 12, boxShadow: '0 12px 28px rgba(15,23,42,0.18)', padding: 8, zIndex: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: A_ACCENT, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A</div>
                    <div><div style={{ fontSize: 14, fontWeight: 600 }}>admin@katie-english.com.vn</div><div style={{ fontSize: 12, color: '#64748B' }}>Administrator</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 8px', borderRadius: 8, fontSize: 14, color: '#E11D48', cursor: 'pointer' }}><Icon name="log-out" size={14} /> Sign out</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ padding: '0 32px 32px' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Btn, Card, Chip, AdminShell, A_ACCENT });

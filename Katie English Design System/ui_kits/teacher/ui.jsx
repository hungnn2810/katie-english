/* Katie English — Teacher Portal UI kit: shared primitives + shell */

const ACCENT = '#F0623A';
const ACCENT_BG = 'rgba(240,98,58,0.12)';
const ACCENT_TEXT = '#FDA087';
const SIDEBAR = '#0C1220';

/* Lucide icon — renders an <i data-lucide> and converts it at the requested size.
   Each effect converts only its own freshly-appended placeholder, so mixed sizes
   stay correct. */
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

function Btn({ children, variant = 'contained', accent = ACCENT, onClick, style = {}, type = 'button' }) {
  const base = {
    fontFamily: 'Inter', fontWeight: 600, fontSize: 14, cursor: 'pointer',
    border: 'none', borderRadius: 8, padding: '10px 18px', display: 'inline-flex',
    alignItems: 'center', gap: 7, transition: 'opacity .15s, background .15s', ...style,
  };
  const variants = {
    contained: { background: accent, color: '#fff' },
    outline: { background: 'none', color: '#0F172A', boxShadow: 'inset 0 0 0 1.5px #E2E8F0' },
    text: { background: 'none', color: accent, padding: '8px 6px' },
  };
  return (
    <button type={type} onClick={onClick}
      onMouseEnter={(e) => { if (variant === 'contained') e.currentTarget.style.opacity = '0.9'; else e.currentTarget.style.background = variant === 'outline' ? '#F7F9FC' : ACCENT_BG; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; if (variant !== 'contained') e.currentTarget.style.background = 'none'; }}
      style={{ ...base, ...variants[variant] }}>{children}</button>
  );
}

function Card({ children, style = {}, hover = false, onClick }) {
  return (
    <div onClick={onClick}
      onMouseEnter={hover ? (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15,23,42,0.12)'; } : undefined}
      onMouseLeave={hover ? (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } : undefined}
      style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, transition: 'all .2s', cursor: onClick ? 'pointer' : 'default', ...style }}>
      {children}
    </div>
  );
}

function Chip({ children, bg = '#F1F5F9', color = '#64748B' }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'Inter', fontWeight: 700, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: bg, color }}>{children}</span>;
}

function Field({ label, value, onChange, placeholder, type = 'text', focused }) {
  const [foc, setFoc] = React.useState(false);
  const active = foc || focused;
  return (
    <label style={{ position: 'relative', display: 'block' }}>
      <span style={{ position: 'absolute', top: -8, left: 11, background: '#fff', padding: '0 5px', fontSize: 11, fontWeight: 500, color: active ? ACCENT : '#64748B' }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ width: '100%', fontFamily: 'Inter', fontSize: 14, padding: '12px 14px', borderRadius: 8, border: `1.5px solid ${active ? ACCENT : '#E2E8F0'}`, color: '#0F172A', outline: 'none', background: '#fff' }} />
    </label>
  );
}

const NAV_GROUPS = [
  { label: null, items: [{ key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' }] },
  { label: 'GENERAL', items: [
    { key: 'classes', label: 'Classes', icon: 'school' },
    { key: 'students', label: 'Students', icon: 'users' },
    { key: 'homework', label: 'Homework', icon: 'book-open' },
    { key: 'sessions', label: 'Sessions', icon: 'video' },
  ] },
];

function TeacherShell({ active, onNav, title, subtitle, breadcrumb, children, accent = ACCENT, portal = 'Teacher Portal' }) {
  const [menu, setMenu] = React.useState(false);
  const aBg = accent === ACCENT ? ACCENT_BG : 'rgba(79,157,255,0.12)';
  const aText = accent === ACCENT ? ACCENT_TEXT : '#60A5FA';
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 600, fontFamily: 'Inter', background: '#F7F9FC' }}>
      {/* Sidebar */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', background: SIDEBAR }}>
        <div style={{ padding: '28px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent, color: '#fff', fontWeight: 900, fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>K</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em' }}>Katie English</div>
              <div style={{ color: '#64748B', fontSize: 10, letterSpacing: '0.05em', marginTop: 3 }}>{portal}</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
          {NAV_GROUPS.map((g, gi) => (
            <div key={gi} style={{ marginTop: gi > 0 ? 20 : 0 }}>
              {g.label && <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', padding: '0 12px', marginBottom: 6 }}>{g.label}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {g.items.map((it) => {
                  const on = active === it.key;
                  return (
                    <div key={it.key} onClick={() => onNav(it.key)}
                      onMouseEnter={(e) => { if (!on) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#E2E8F0'; } }}
                      onMouseLeave={(e) => { if (!on) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8'; } }}
                      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: on ? 600 : 500, color: on ? aText : '#94A3B8', background: on ? aBg : 'none' }}>
                      {on && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: '0 4px 4px 0', background: accent }} />}
                      <Icon name={it.icon} size={15} /> {it.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 20px 20px' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, fontSize: 10, color: '#475569', textAlign: 'center' }}>© Katie English</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '32px 32px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {portal} <span style={{ opacity: 0.4 }}>›</span> <span style={{ color: '#0F172A', opacity: 0.5, fontWeight: 500 }}>{breadcrumb || title}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>{title}</div>
              {subtitle && <div style={{ fontSize: 14, color: '#64748B', marginTop: 8 }}>{subtitle}</div>}
            </div>
            <div style={{ position: 'relative', flexShrink: 0, marginTop: 4 }}>
              <button onClick={() => setMenu((v) => !v)} style={{ width: 36, height: 36, borderRadius: '50%', background: accent, color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>K</button>
              {menu && (
                <div style={{ position: 'absolute', right: 0, top: 44, width: 240, background: '#fff', borderRadius: 12, boxShadow: '0 12px 28px rgba(15,23,42,0.18)', padding: 8, zIndex: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 12px', borderBottom: '1px solid #E2E8F0', marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: accent, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>K</div>
                    <div><div style={{ fontSize: 14, fontWeight: 600 }}>katie.tran</div><div style={{ fontSize: 12, color: '#64748B' }}>Teacher</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 8px', borderRadius: 8, fontSize: 14, color: '#64748B', cursor: 'pointer' }}><Icon name="key-round" size={14} /> Change password</div>
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

Object.assign(window, { Icon, Btn, Card, Chip, Field, TeacherShell, T_ACCENT: ACCENT });

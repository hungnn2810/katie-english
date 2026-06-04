/* Katie English — Student Game Portal UI kit: phone shell + primitives */

const PURPLE = '#A78BFA';
const GAME_BG = '#2D0B2E';
const GRAD = {
  card1: 'linear-gradient(135deg,#F97316,#FBBF24)',
  card2: 'linear-gradient(135deg,#EC4899,#F472B6)',
  card3: 'linear-gradient(135deg,#8B5CF6,#A78BFA)',
  card4: 'linear-gradient(135deg,#10B981,#34D399)',
  card5: 'linear-gradient(135deg,#EF4444,#F87171)',
  card6: 'linear-gradient(135deg,#06B6D4,#67E8F9)',
  primaryPurple: 'linear-gradient(135deg,#4F9DFF,#A78BFA)',
  pinkHighlight: 'linear-gradient(135deg,#FF9BD2,#FF7B7B)',
  greenSecondary: 'linear-gradient(135deg,#7BD88F,#6ED6C1)',
};
const CARD_GRADS = [GRAD.card1, GRAD.card2, GRAD.card3, GRAD.card4, GRAD.card5, GRAD.card6];

function scoreColor(s) { return s >= 80 ? '#7BD88F' : s >= 50 ? '#FFD166' : '#FF7B7B'; }

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

/* Big squishy kid button — scales on press */
function KidButton({ children, onClick, grad, style = {}, full }) {
  const [down, setDown] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseDown={() => setDown(true)} onMouseUp={() => setDown(false)} onMouseLeave={() => setDown(false)}
      style={{
        fontFamily: 'Inter', fontWeight: 900, fontSize: 18, color: '#fff', border: 'none',
        borderRadius: 16, padding: '16px 28px', cursor: 'pointer', width: full ? '100%' : 'auto',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
        background: grad || 'rgba(255,255,255,0.22)',
        transform: down ? 'scale(0.96)' : 'scale(1)', transition: 'transform .12s', ...style,
      }}>{children}</button>
  );
}

/* Decorative concentric arcs — the one student-portal motif */
function Arcs() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.07 }}>
      {[150, 230, 320].map((r) => <circle key={'l' + r} cx="-30" cy="320" r={r} fill="none" stroke="#fff" strokeWidth="1" />)}
      {[150, 230, 320].map((r) => <circle key={'r' + r} cx="420" cy="320" r={r} fill="none" stroke="#fff" strokeWidth="1" />)}
    </svg>
  );
}

/* Phone frame on the wine stage */
function Phone({ children, bg = GAME_BG, noArcs }) {
  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(circle at 50% 0%, #3a1140, #1F0821)' }}>
      <div style={{ width: 390, height: 800, borderRadius: 44, padding: 12, background: '#0b0410', boxShadow: '0 40px 90px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 34, overflow: 'hidden', background: bg, fontFamily: 'Inter' }}>
          {!noArcs && <Arcs />}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', zIndex: 30 }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>9:41</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <Icon name="signal" size={13} color="#fff" /><Icon name="wifi" size={13} color="#fff" /><Icon name="battery-full" size={15} color="#fff" />
            </div>
          </div>
          <div style={{ position: 'absolute', top: 34, left: 0, right: 0, bottom: 0, overflowY: 'auto', zIndex: 10 }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* Top bar inside a screen */
function GameHeader({ name, onBack }) {
  return (
    <div style={{ position: 'relative', zIndex: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {onBack ? (
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', width: 38, height: 38, borderRadius: 12, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-left" size={18} color="#fff" /></button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: '#fff', color: '#4F9DFF', fontWeight: 900, fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>K</div>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 17 }}>Katie English</span>
        </div>
      )}
      {name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '6px 12px 6px 6px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRAD.pinkHighlight, color: '#fff', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{name[0]}</div>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: 600 }}>{name}</span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Icon, KidButton, Phone, GameHeader, Arcs, S_PURPLE: PURPLE, S_GRAD: GRAD, CARD_GRADS, scoreColor, GAME_BG });

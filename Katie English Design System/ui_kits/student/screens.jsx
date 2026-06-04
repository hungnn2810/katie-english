/* Katie English — Student Game Portal screens (Vietnamese, mobile-first) */
const G = window.S_GRAD;
const PUR = window.S_PURPLE;

/* ── Login ─────────────────────────────────────────────── */
function StudentLogin({ onEnter }) {
  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const ready = code.trim().length >= 4 && name.trim().length >= 1 && pw.length >= 4;
  function submit() {
    setTried(true);
    if (ready) onEnter(name.trim());
  }
  const codeBad = tried && code.trim().length < 4;
  const nameBad = tried && name.trim().length < 1;
  const pwBad = tried && pw.length < 4;
  return (
    <Phone>
      <div style={{ padding: '32px 26px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: PUR, color: '#fff', fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>K</div>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>Katie English</span>
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 10 }}>Học tiếng Anh<br /><span style={{ color: PUR }}>thật vui!</span></div>
        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, marginBottom: 24 }}>Đăng nhập để bắt đầu nào.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, marginBottom: 7 }}>Mã lớp</div>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="VD: SUN2A" style={{ ...inp, border: `2px solid ${codeBad ? '#FF7B7B' : 'rgba(255,255,255,0.18)'}` }} />
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, marginBottom: 7 }}>Tên của em</div>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Nhập tên của em" style={{ ...inp, border: `2px solid ${nameBad ? '#FF7B7B' : 'rgba(255,255,255,0.18)'}` }} />
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, marginBottom: 7 }}>Mật khẩu</div>
            <div style={{ position: 'relative' }}>
              <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Ít nhất 4 ký tự" type={showPw ? 'text' : 'password'} style={{ ...inp, paddingRight: 48, border: `2px solid ${pwBad ? '#FF7B7B' : 'rgba(255,255,255,0.18)'}` }} />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={showPw ? 'eye-off' : 'eye'} size={18} color="rgba(255,255,255,0.7)" /></button>
            </div>
          </div>
          {tried && !ready && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#FF9BD2', fontSize: 13, fontWeight: 700 }}>
              <Icon name="alert-circle" size={15} color="#FF9BD2" /> Em hãy điền đầy đủ thông tin để đăng nhập nhé!
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <KidButton full grad={ready ? G.primaryPurple : undefined} onClick={submit} style={ready ? {} : { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>Đăng nhập →</KidButton>
        <div style={{ textAlign: 'center', marginTop: 14, color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600 }}>Quên mật khẩu? <span style={{ color: PUR, cursor: 'pointer' }}>Hỏi cô giáo nhé</span></div>
      </div>
    </Phone>
  );
}
const inp = { width: '100%', fontFamily: 'Inter', fontSize: 17, fontWeight: 600, padding: '15px 16px', borderRadius: 14, border: '2px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none' };

/* ── Homework list ─────────────────────────────────────── */
const HW = [
  { type: 'Phát âm', icon: 'hash', tags: ['cat', 'dog', 'ship'], status: { t: 'Còn 4 ngày', icon: 'calendar', urgent: false }, kind: 'record' },
  { type: 'Từ vựng', icon: 'image', tags: ['8 hình'], status: { t: 'Tốt nhất: 92%', icon: 'trophy', best: true }, kind: 'vocab' },
  { type: 'Nói', icon: 'mic', tags: ['Tả công viên'], status: { t: 'Hạn hôm nay', icon: 'zap', urgent: true }, kind: 'record' },
  { type: 'Nghe', icon: 'headphones', tags: ['3 câu hỏi'], status: { t: 'Còn 2 ngày', icon: 'calendar' }, kind: 'listen' },
];

function HomeworkList({ name, onOpen, empty }) {
  return (
    <Phone>
      <GameHeader name={name} />
      <div style={{ position: 'relative', zIndex: 10, padding: '8px 18px 30px' }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 4 }}>Chào, {name}!</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: 600, marginBottom: 24 }}>Hôm nay học gì nào?</div>
        {empty ? (
          <div style={{ textAlign: 'center', padding: '70px 0' }}>
            <div style={{ width: 76, height: 76, borderRadius: 20, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}><Icon name="party-popper" size={36} color="#fff" /></div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 21 }}>Hôm nay chưa có bài tập!</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8 }}>Quay lại sau khi cô giao bài nhé.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {HW.map((h, i) => <HwCard key={i} h={h} grad={CARD_GRADS[i % CARD_GRADS.length]} onClick={() => onOpen(h)} />)}
          </div>
        )}
      </div>
    </Phone>
  );
}

function HwCard({ h, grad, onClick }) {
  const [hover, setHover] = React.useState(false);
  const st = h.status;
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: grad, borderRadius: 24, padding: 20, boxShadow: '0 12px 28px rgba(0,0,0,0.3)', cursor: 'pointer', transform: hover ? 'scale(1.03)' : 'scale(1)', transition: 'transform .15s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={st.best ? 'star' : h.icon} size={23} color="#fff" /></div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 900, fontSize: 13, color: '#fff', padding: '6px 11px', borderRadius: 999, background: st.best ? '#7BD88F' : st.urgent ? '#FF7B7B' : 'rgba(255,255,255,0.25)' }}><Icon name={st.icon} size={13} color="#fff" /> {st.t}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#fff', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 11 }}><Icon name={h.icon} size={16} color="#fff" /> {h.type}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
        {h.tags.map((t, i) => <span key={i} style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '5px 11px', borderRadius: 999 }}>{t}</span>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 900, fontSize: 16, padding: '13px', borderRadius: 13 }}>
        <Icon name={st.best ? 'refresh-cw' : 'play'} size={16} color="#fff" /> {st.best ? 'Làm lại →' : 'Bắt đầu →'}
      </div>
    </div>
  );
}

/* ── Vocabulary session — tap the correct word ─────────── */
const VOCAB = { word: 'butterfly', choices: ['butterfly', 'bird', 'flower', 'bee'], img: 'linear-gradient(135deg,#FBBF24,#F472B6)' };
function VocabSession({ onDone, onBack }) {
  const [pick, setPick] = React.useState(null);
  const correct = VOCAB.word;
  return (
    <Phone>
      <GameHeader onBack={onBack} />
      <Progress step={2} total={4} active />
      <div style={{ position: 'relative', zIndex: 10, padding: '6px 22px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>Chọn từ đúng</div>
        <div style={{ width: 240, height: 200, borderRadius: 22, border: '4px solid rgba(255,255,255,0.2)', background: VOCAB.img, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="image" size={56} color="rgba(255,255,255,0.85)" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, width: '100%' }}>
          {VOCAB.choices.map((c) => {
            const chosen = pick === c;
            const isCorrect = pick && c === correct;
            const wrong = chosen && c !== correct;
            let bg = 'rgba(255,255,255,0.1)', border = '2px solid rgba(255,255,255,0.2)';
            if (isCorrect) { bg = 'rgba(123,216,143,0.25)'; border = '2px solid #7BD88F'; }
            else if (wrong) { bg = 'rgba(255,123,123,0.25)'; border = '2px solid #FF7B7B'; }
            return (
              <button key={c} onClick={() => setPick(c)} style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 19, color: '#fff', padding: '20px 12px', borderRadius: 16, border, background: bg, cursor: 'pointer', transition: 'all .15s' }}>{c}</button>
            );
          })}
        </div>
        {pick && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: pick === correct ? '#7BD88F' : '#FF7B7B' }}>{pick === correct ? 'Đúng rồi! 🎉'.replace(' 🎉', '') : 'Chưa đúng'}</div>
            <KidButton full grad={G.greenSecondary} onClick={onDone}>Tiếp →</KidButton>
          </div>
        )}
      </div>
    </Phone>
  );
}

function Progress({ step, total }) {
  return (
    <div style={{ position: 'relative', zIndex: 10, padding: '4px 22px 0', display: 'flex', alignItems: 'center', gap: 7 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 8, borderRadius: 999, background: i < step - 1 ? 'rgba(255,255,255,0.5)' : i === step - 1 ? PUR : 'rgba(255,255,255,0.15)' }} />
      ))}
    </div>
  );
}

/* ── Record session — phonics / speaking ───────────────── */
function RecordSession({ onDone, onBack, speaking }) {
  const [state, setState] = React.useState('ready'); // ready, idle, recording, scoring, done
  React.useEffect(() => {
    if (state === 'scoring') { const t = setTimeout(() => setState('done'), 1500); return () => clearTimeout(t); }
  }, [state]);
  return (
    <Phone>
      <GameHeader onBack={onBack} />
      <Progress step={1} total={3} />
      <div style={{ position: 'relative', zIndex: 10, padding: '20px 26px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, minHeight: 560, justifyContent: 'center' }}>
        {state === 'ready' ? (
          <>
            <div style={{ color: '#fff', fontSize: 30, fontWeight: 900 }}>Sẵn sàng chưa?</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center' }}>{speaking ? 'Nhìn hình và nói một câu nhé' : 'Đọc to từng từ thật rõ ràng'}</div>
            <KidButton grad={G.primaryPurple} style={{ fontSize: 20, padding: '18px 40px' }} onClick={() => setState('idle')}>Bắt đầu →</KidButton>
          </>
        ) : (
          <>
            {speaking ? (
              <div style={{ width: 220, height: 200, borderRadius: 20, border: '4px solid rgba(255,255,255,0.2)', background: 'linear-gradient(135deg,#34D399,#67E8F9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trees" size={56} color="rgba(255,255,255,0.9)" /></div>
            ) : (
              <div style={{ fontSize: 60, fontWeight: 900, color: '#fff', letterSpacing: '0.04em' }}>ship</div>
            )}
            <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 16, fontWeight: 700, padding: '7px 16px', borderRadius: 999 }}>{speaking ? 'Tả công viên' : '/ʃ/ /ɪ/ /p/'}</span>
            <RecordButton state={state} onStart={() => setState('recording')} onStop={() => setState('scoring')} />
            <div style={{ height: 28 }}>
              {state === 'done' && (
                <KidButton grad={G.greenSecondary} onClick={onDone} style={{ fontSize: 17, padding: '13px 30px' }}>Tiếp →</KidButton>
              )}
            </div>
          </>
        )}
      </div>
    </Phone>
  );
}

function RecordButton({ state, onStart, onStop }) {
  const wrap = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 };
  if (state === 'idle') return (
    <div style={wrap}>
      <button onClick={onStart} style={{ width: 104, height: 104, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="mic" size={42} color="#fff" /></button>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>Nhấn để ghi âm</div>
    </div>
  );
  if (state === 'recording') return (
    <div style={wrap}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 104, height: 104, borderRadius: '50%', background: '#ef4444', opacity: 0.25, animation: 'ping 1.3s cubic-bezier(0,0,0.2,1) infinite' }} />
        <button onClick={onStop} style={{ position: 'relative', width: 104, height: 104, borderRadius: '50%', border: '4px solid #ef4444', background: 'rgba(239,68,68,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 34, height: 34, borderRadius: 7, background: '#f87171' }} /></button>
      </div>
      <div style={{ color: '#f87171', fontSize: 15, fontWeight: 700 }}>Đang ghi âm… nhấn để dừng</div>
    </div>
  );
  if (state === 'scoring') return (
    <div style={wrap}>
      <div style={{ width: 104, height: 104, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spin" style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%' }} /></div>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>Đang chấm điểm…</div>
    </div>
  );
  return (
    <div style={wrap}>
      <div style={{ width: 104, height: 104, borderRadius: '50%', border: '4px solid rgba(52,211,153,0.5)', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={42} color="#34d399" /></div>
      <div style={{ color: '#34d399', fontSize: 16, fontWeight: 800 }}>Xong!</div>
    </div>
  );
}

/* ── Listen & Answer ───────────────────────────────────── */
function ListenSession({ onDone, onBack }) {
  const [pick, setPick] = React.useState(null);
  const [playing, setPlaying] = React.useState(false);
  const choices = ['At the zoo', 'At school', 'At the park', 'At home'];
  const correct = 'At the park';
  return (
    <Phone>
      <GameHeader onBack={onBack} />
      <Progress step={1} total={3} />
      <div style={{ position: 'relative', zIndex: 10, padding: '14px 22px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>Nghe và trả lời</div>
        {/* Audio player */}
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 22, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setPlaying((p) => !p)} style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', background: G.primaryPurple, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={playing ? 'pause' : 'play'} size={26} color="#fff" /></button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 34 }}>
              {[12, 22, 30, 18, 26, 14, 30, 20, 10, 24, 16, 28, 12, 22, 18, 26, 14, 20].map((h, i) => (
                <div key={i} style={{ flex: 1, height: h, borderRadius: 3, background: playing && i < 9 ? PUR : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, marginTop: 6 }}>0:09 / 0:18</div>
          </div>
        </div>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, alignSelf: 'flex-start' }}>Where are the children?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, width: '100%' }}>
          {choices.map((c) => {
            const chosen = pick === c, isC = pick && c === correct, wrong = chosen && c !== correct;
            let bg = 'rgba(255,255,255,0.1)', border = '2px solid rgba(255,255,255,0.2)';
            if (isC) { bg = 'rgba(123,216,143,0.25)'; border = '2px solid #7BD88F'; }
            else if (wrong) { bg = 'rgba(255,123,123,0.25)'; border = '2px solid #FF7B7B'; }
            return <button key={c} onClick={() => setPick(c)} style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 17, color: '#fff', textAlign: 'left', padding: '16px 18px', borderRadius: 14, border, background: bg, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{c}{isC && <Icon name="check-circle-2" size={20} color="#7BD88F" />}</button>;
          })}
        </div>
        {pick && <KidButton full grad={G.greenSecondary} onClick={onDone}>Tiếp →</KidButton>}
      </div>
    </Phone>
  );
}

/* ── Results ───────────────────────────────────────────── */
const RESULT_MSG = (s) => s >= 80 ? 'Tuyệt vời! Em làm rất tốt!' : s >= 50 ? 'Làm tốt lắm! Cố thêm chút nữa nhé!' : 'Đừng lo, thử lại nhé!';
function Results({ score = 88, onFinish }) {
  const col = scoreColor(score);
  const items = [{ w: 'butterfly', s: 95 }, { w: 'ship', s: 88 }, { w: 'park', s: 72 }];
  return (
    <Phone>
      <div style={{ position: 'relative', zIndex: 10, padding: '40px 26px 30px', display: 'flex', flexDirection: 'column', minHeight: 700 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Icon name="party-popper" size={38} color="#fff" /></div>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 900 }}>Hoàn thành bài tập!</div>
          <div style={{ fontSize: 78, fontWeight: 900, color: col, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 6 }}>{score}%</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: 700, marginTop: 4 }}>{RESULT_MSG(score)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 26 }}>
          {items.map((it, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: CARD_GRADS[i % CARD_GRADS.length], flexShrink: 0 }} />
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, flex: 1 }}>{it.w}</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: scoreColor(it.s) }}>{it.s}%</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <KidButton full grad={G.greenSecondary} onClick={onFinish} style={{ fontSize: 19 }}>Nộp bài!</KidButton>
      </div>
    </Phone>
  );
}

/* ── Router ────────────────────────────────────────────── */
function StudentApp() {
  const [screen, setScreen] = React.useState('login');
  const [name, setName] = React.useState('Mai');
  const open = (h) => setScreen(h.kind === 'vocab' ? 'vocab' : h.kind === 'listen' ? 'listen' : (h.type === 'Nói' ? 'speaking' : 'phonics'));
  if (screen === 'login') return <StudentLogin onEnter={(n) => { setName(n); setScreen('list'); }} />;
  if (screen === 'list') return <HomeworkList name={name} onOpen={open} />;
  if (screen === 'vocab') return <VocabSession onBack={() => setScreen('list')} onDone={() => setScreen('results')} />;
  if (screen === 'phonics') return <RecordSession onBack={() => setScreen('list')} onDone={() => setScreen('results')} />;
  if (screen === 'speaking') return <RecordSession speaking onBack={() => setScreen('list')} onDone={() => setScreen('results')} />;
  if (screen === 'listen') return <ListenSession onBack={() => setScreen('list')} onDone={() => setScreen('results')} />;
  if (screen === 'results') return <Results onFinish={() => setScreen('list')} />;
  return null;
}

Object.assign(window, { StudentApp, StudentLogin, HomeworkList, VocabSession, RecordSession, ListenSession, Results });

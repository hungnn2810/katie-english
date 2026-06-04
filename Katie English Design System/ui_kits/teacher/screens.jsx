/* Katie English — Teacher Portal screens */
const ACC = window.T_ACCENT;

function StatCard({ icon, value, label, color, bg }) {
  return (
    <Card hover style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}><Icon name={icon} size={20} color={color} /></div>
        <Icon name="arrow-right" size={16} color="#94A3B8" />
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>{label}</div>
    </Card>
  );
}

function Dashboard({ onNav }) {
  const classes = [
    { n: 'Sunflower 2A', c: 'SUN2A', t: 'in 2h', today: true },
    { n: 'Rainbow 1B', c: 'RNB1B', t: 'tomorrow', today: false },
    { n: 'Star Class 3C', c: 'STR3C', t: 'in 2 days', today: false },
  ];
  const links = [
    { k: 'classes', label: 'Manage Classes', desc: 'Create and schedule classes', icon: 'school', color: ACC },
    { k: 'students', label: 'Manage Students', desc: 'Add students and parent contacts', icon: 'users', color: '#6ED6C1' },
    { k: 'homework', label: 'Assign Homework', desc: 'Create phonics & speaking sets', icon: 'book-open', color: '#A78BFA' },
    { k: 'sessions', label: 'View Sessions', desc: 'Review completed homework', icon: 'video', color: '#64748B' },
  ];
  return (
    <div>
      <div style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #FCD34D', background: '#FFFBEB', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name="alert-triangle" size={16} color="#F59E0B" />
        <span style={{ color: '#92400E', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>3 pending registration approvals</span>
        <span style={{ color: '#92400E', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>1 password reset request</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 22 }}>
        <StatCard icon="school" value="12" label="Total Classes" color={ACC} bg="#FFF2EF" />
        <StatCard icon="users" value="148" label="Total Students" color="#6ED6C1" bg="#F0FDFB" />
        <StatCard icon="book-open" value="36" label="Homework Sets" color="#A78BFA" bg="#F5F3FF" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid #E2E8F0' }}>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>Upcoming Classes</div><div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>1 class today</div></div>
            <span onClick={() => onNav('classes')} style={{ fontSize: 12, fontWeight: 600, color: ACC, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>View all <Icon name="chevron-right" size={12} /></span>
          </div>
          <div style={{ padding: '4px 22px' }}>
            {classes.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: i < classes.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.today ? '#FFF2EF' : '#F8FAFC' }}><Icon name="school" size={16} color={c.today ? ACC : '#94A3B8'} /></div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{c.n}</div><div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{c.c}</div></div>
                <div style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: c.today ? '#FFF2EF' : '#F1F5F9', color: c.today ? ACC : '#64748B' }}>{c.t}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #E2E8F0', fontWeight: 700, fontSize: 14 }}>Quick Links</div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {links.map((l) => (
              <div key={l.k} onClick={() => onNav(l.k)} onMouseEnter={(e) => e.currentTarget.style.background = '#F7F9FC'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 12, cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: l.color + '18' }}><Icon name={l.icon} size={16} color={l.color} /></div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{l.label}</div><div style={{ fontSize: 12, color: '#64748B' }}>{l.desc}</div></div>
                <Icon name="chevron-right" size={14} color="#CBD5E1" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TableShell({ columns, children, action }) {
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: columns.map((c) => c.w).join(' '), padding: '12px 22px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
        {columns.map((c, i) => <div key={i} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>{c.label}</div>)}
      </div>
      {children}
    </Card>
  );
}

function Row({ columns, cells, last }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns.map((c) => c.w).join(' '), padding: '14px 22px', borderBottom: last ? 'none' : '1px solid #E2E8F0', alignItems: 'center' }}>
      {cells.map((c, i) => <div key={i} style={{ fontSize: 14 }}>{c}</div>)}
    </div>
  );
}

function Classes() {
  const cols = [{ label: 'Class', w: '2fr' }, { label: 'Code', w: '1fr' }, { label: 'Students', w: '1fr' }, { label: 'Schedule', w: '1.4fr' }, { label: 'Status', w: '1fr' }];
  const rows = [
    ['Sunflower 2A', 'SUN2A', '24', 'Mon · Wed 17:00', <Chip bg="#F0FDF4" color="#16A34A">Active</Chip>],
    ['Rainbow 1B', 'RNB1B', '21', 'Tue · Thu 18:00', <Chip bg="#F0FDF4" color="#16A34A">Active</Chip>],
    ['Star Class 3C', 'STR3C', '18', 'Sat 09:00', <Chip bg="#F0FDF4" color="#16A34A">Active</Chip>],
    ['Moon 4A', 'MON4A', '0', 'Not scheduled', <Chip>Draft</Chip>],
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><Btn><Icon name="plus" size={16} /> New Class</Btn></div>
      <TableShell columns={cols}>
        {rows.map((r, i) => <Row key={i} columns={cols} cells={r} last={i === rows.length - 1} />)}
      </TableShell>
    </div>
  );
}

function Students() {
  const cols = [{ label: 'Student', w: '2fr' }, { label: 'Class', w: '1fr' }, { label: 'Parent', w: '1.4fr' }, { label: 'Status', w: '1.2fr' }];
  const rows = [
    [<b>Nguyễn Minh Anh</b>, 'Sunflower 2A', '090 123 4567', <Chip bg="#F0FDF4" color="#16A34A">Approved</Chip>],
    [<b>Trần Bảo Long</b>, 'Rainbow 1B', '091 555 8899', <Chip bg="#F0FDF4" color="#16A34A">Approved</Chip>],
    [<b>Lê Gia Hân</b>, 'Sunflower 2A', '098 222 1010', <span style={{ display: 'flex', gap: 8 }}><Chip bg="#FFFBEB" color="#92400E">Pending</Chip><Btn variant="text" style={{ padding: 0, fontSize: 13 }}>Approve</Btn></span>],
    [<b>Phạm Khải</b>, 'Star Class 3C', '097 444 3322', <Chip bg="#FFF2EF" color={ACC}>Reset req.</Chip>],
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}><Btn variant="outline"><Icon name="check-circle-2" size={15} /> Approve all</Btn></div>
        <Btn><Icon name="plus" size={16} /> Add Student</Btn>
      </div>
      <TableShell columns={cols}>{rows.map((r, i) => <Row key={i} columns={cols} cells={r} last={i === rows.length - 1} />)}</TableShell>
    </div>
  );
}

const HW_TYPES = [
  { type: 'PHONICS', icon: 'hash', color: '#F97316' },
  { type: 'SPEAKING', icon: 'mic', color: '#EC4899' },
  { type: 'VOCABULARY', icon: 'image', color: '#8B5CF6' },
  { type: 'LISTEN', icon: 'headphones', color: '#06B6D4' },
];

function Homework({ onCreate }) {
  const cols = [{ label: 'Homework', w: '2.2fr' }, { label: 'Type', w: '1fr' }, { label: 'Class', w: '1fr' }, { label: 'Due', w: '1fr' }, { label: 'Submitted', w: '1fr' }];
  const rows = [
    ['CVC words — week 3', <Chip bg="#FFF7ED" color="#F97316"><Icon name="hash" size={12} /> Phonics</Chip>, 'Sunflower 2A', 'in 4 days', '18 / 24'],
    ['Describe the park', <Chip bg="#FDF2F8" color="#EC4899"><Icon name="mic" size={12} /> Speaking</Chip>, 'Rainbow 1B', 'tomorrow', '9 / 21'],
    ['Animals flashcards', <Chip bg="#F5F3FF" color="#8B5CF6"><Icon name="image" size={12} /> Vocabulary</Chip>, 'Star Class 3C', 'in 2 days', '14 / 18'],
    ['Morning routine clip', <Chip bg="#ECFEFF" color="#06B6D4"><Icon name="headphones" size={12} /> Listen</Chip>, 'Sunflower 2A', 'Overdue', '24 / 24'],
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><Btn onClick={onCreate}><Icon name="plus" size={16} /> Create Homework</Btn></div>
      <TableShell columns={cols}>{rows.map((r, i) => <Row key={i} columns={cols} cells={r} last={i === rows.length - 1} />)}</TableShell>
    </div>
  );
}

function CreateHomework({ onBack }) {
  const [picked, setPicked] = React.useState('PHONICS');
  const [words, setWords] = React.useState(['cat', 'dog', 'ship']);
  const [draft, setDraft] = React.useState('');
  return (
    <div style={{ maxWidth: 720 }}>
      <Btn variant="text" onClick={onBack} style={{ marginBottom: 14, paddingLeft: 0 }}><Icon name="chevron-left" size={16} /> Back to Homework</Btn>
      <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1 · Choose type</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 26 }}>
        {HW_TYPES.map((t) => {
          const on = picked === t.type;
          return (
            <div key={t.type} onClick={() => setPicked(t.type)} style={{ padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'center', background: '#fff', border: `2px solid ${on ? t.color : '#E2E8F0'}`, boxShadow: on ? `0 4px 12px ${t.color}33` : 'none' }}>
              <div style={{ width: 44, height: 44, margin: '0 auto 10px', borderRadius: 12, background: t.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={t.icon} size={20} color={t.color} /></div>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{t.type.toLowerCase()}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2 · Build word list</div>
      <Card style={{ padding: 22 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}><Field label="Title" value="CVC words — week 4" /></div>
          <div style={{ width: 160 }}><Field label="Assign to" value="Sunflower 2A" /></div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {words.map((w, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: '#FFF7ED', color: '#F97316', fontWeight: 700, fontSize: 14 }}>
              {w} <Icon name="x" size={13} color="#F97316" style={{ cursor: 'pointer' }} />
            </span>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setWords([...words, draft.trim()]); setDraft(''); } }} style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Add a word" value={draft} onChange={setDraft} placeholder="type a word and press Add" /></div>
          <Btn type="submit"><Icon name="plus" size={16} /> Add</Btn>
        </form>
      </Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <Btn variant="outline" onClick={onBack}>Cancel</Btn>
        <Btn><Icon name="check" size={16} /> Publish homework</Btn>
      </div>
    </div>
  );
}

const TEACHER_TITLES = {
  dashboard: { title: 'Dashboard', sub: 'Welcome back, Katie' },
  classes: { title: 'Classes', sub: 'Create and schedule your classes' },
  students: { title: 'Students', sub: 'Approve registrations and manage profiles' },
  homework: { title: 'Homework', sub: 'All homework you have assigned' },
  sessions: { title: 'Sessions', sub: 'Completed homework submissions' },
};

function TeacherApp() {
  const [screen, setScreen] = React.useState('dashboard');
  const meta = TEACHER_TITLES[screen] || TEACHER_TITLES.dashboard;
  let body, title = meta.title, sub = meta.sub, crumb;
  if (screen === 'dashboard') body = <Dashboard onNav={setScreen} />;
  else if (screen === 'classes') body = <Classes />;
  else if (screen === 'students') body = <Students />;
  else if (screen === 'homework') body = <Homework onCreate={() => setScreen('create')} />;
  else if (screen === 'create') { title = 'Create Homework'; sub = 'Build a new homework set'; crumb = 'Homework'; body = <CreateHomework onBack={() => setScreen('homework')} />; }
  else body = <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}><Icon name="video" size={40} /><div style={{ marginTop: 12, fontWeight: 600 }}>No sessions yet</div></div>;
  return <TeacherShell active={screen === 'create' ? 'homework' : screen} onNav={setScreen} title={title} subtitle={sub} breadcrumb={crumb}>{body}</TeacherShell>;
}

Object.assign(window, { TeacherApp });

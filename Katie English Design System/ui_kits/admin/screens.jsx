/* Katie English — Admin Portal screens (data-dense) */
const ACC = window.A_ACCENT;

function Toolbar({ children, search }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
      <div style={{ position: 'relative', width: 280 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><Icon name="search" size={15} color="#94A3B8" /></span>
        <input placeholder={search || 'Search…'} style={{ width: '100%', fontFamily: 'Inter', fontSize: 13, padding: '9px 12px 9px 34px', borderRadius: 8, border: '1.5px solid #E2E8F0', outline: 'none', background: '#fff' }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>{children}</div>
    </div>
  );
}

function Table({ cols, rows }) {
  const grid = cols.map((c) => c.w).join(' ');
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: grid, padding: '11px 22px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
        {cols.map((c, i) => <div key={i} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>{c.label}</div>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, padding: '13px 22px', borderBottom: i < rows.length - 1 ? '1px solid #E2E8F0' : 'none', alignItems: 'center', fontSize: 14 }}>
          {r.map((c, j) => <div key={j}>{c}</div>)}
        </div>
      ))}
    </Card>
  );
}

function MiniStat({ icon, value, label, color, bg }) {
  return (
    <Card style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={19} color={color} /></div>
      <div><div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div><div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>{label}</div></div>
    </Card>
  );
}

function AdminDashboard() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        <MiniStat icon="users" value="9" label="Teachers" color={ACC} bg="#EFF6FF" />
        <MiniStat icon="school" value="12" label="Classes" color="#6ED6C1" bg="#F0FDFB" />
        <MiniStat icon="graduation-cap" value="148" label="Students" color="#A78BFA" bg="#F5F3FF" />
        <MiniStat icon="file-text" value="36" label="Homework" color="#F97316" bg="#FFF7ED" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '15px 22px', borderBottom: '1px solid #E2E8F0', fontWeight: 700, fontSize: 14 }}>Approvals pending</div>
          <div style={{ padding: '6px 22px' }}>
            {[['4 teacher accounts', 'users'], ['11 student registrations', 'graduation-cap'], ['2 password resets', 'key-round']].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: i < 2 ? '1px solid #E2E8F0' : 'none' }}>
                <Icon name={r[1]} size={16} color={ACC} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{r[0]}</span>
                <Btn variant="text" style={{ fontSize: 13, padding: 0 }}>Review</Btn>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '15px 22px', borderBottom: '1px solid #E2E8F0', fontWeight: 700, fontSize: 14 }}>Recent activity</div>
          <div style={{ padding: '6px 22px' }}>
            {[['Katie Tran created class “Moon 4A”', '2h'], ['12 students completed Phonics — week 3', '5h'], ['Admin approved 3 teachers', 'Yesterday'], ['New homework “Listen: routines” published', 'Yesterday']].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 3 ? '1px solid #E2E8F0' : 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: ACC, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13.5 }}>{r[0]}</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

const APR = <Chip bg="#F0FDF4" color="#16A34A">Active</Chip>;
const PEND = <Chip bg="#FFFBEB" color="#92400E">Pending</Chip>;
const OFF = <Chip bg="#FEF2F2" color="#E11D48">Inactive</Chip>;

function Teachers() {
  const cols = [{ label: 'Teacher', w: '1.8fr' }, { label: 'Email', w: '1.8fr' }, { label: 'Classes', w: '0.8fr' }, { label: 'Status', w: '1fr' }, { label: '', w: '1.4fr' }];
  const act = (s) => s === 'pending'
    ? <div style={{ display: 'flex', gap: 8 }}><Btn style={{ padding: '6px 12px', fontSize: 13 }}>Approve</Btn><Btn variant="outline" danger style={{ padding: '6px 12px', fontSize: 13 }}>Reject</Btn></div>
    : <div style={{ display: 'flex', gap: 8 }}><Btn variant="outline" danger style={{ padding: '6px 12px', fontSize: 13 }}>Deactivate</Btn></div>;
  const rows = [
    [<b>Katie Tran</b>, 'katie.tran@katie-english.com.vn', '5', APR, act()],
    [<b>Hoàng Nam</b>, 'nam.hoang@katie-english.com.vn', '3', APR, act()],
    [<b>Đỗ Thu Hà</b>, 'ha.do@katie-english.com.vn', '0', PEND, act('pending')],
    [<b>Vũ Quang</b>, 'quang.vu@katie-english.com.vn', '2', OFF, <Btn variant="outline" style={{ padding: '6px 12px', fontSize: 13 }}>Reactivate</Btn>],
  ];
  return <div><Toolbar search="Search teachers…"><Btn><Icon name="plus" size={16} /> Add Teacher</Btn></Toolbar><Table cols={cols} rows={rows} /></div>;
}

function Students() {
  const cols = [{ label: '', w: '0.3fr' }, { label: 'Student', w: '1.8fr' }, { label: 'Class', w: '1.2fr' }, { label: 'Parent', w: '1.4fr' }, { label: 'Status', w: '1fr' }];
  const cb = <div style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid #CBD5E1' }} />;
  const rows = [
    [cb, <b>Nguyễn Minh Anh</b>, 'Sunflower 2A', '090 123 4567', APR],
    [cb, <b>Trần Bảo Long</b>, 'Rainbow 1B', '091 555 8899', APR],
    [cb, <b>Lê Gia Hân</b>, 'Sunflower 2A', '098 222 1010', PEND],
    [cb, <b>Phạm Khải</b>, 'Star Class 3C', '097 444 3322', PEND],
    [cb, <b>Bùi Thảo My</b>, 'Rainbow 1B', '093 777 1212', APR],
  ];
  return (
    <div>
      <Toolbar search="Search students…">
        <select style={{ fontFamily: 'Inter', fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#0F172A' }}>
          <option>All classes</option><option>Sunflower 2A</option><option>Rainbow 1B</option><option>Star Class 3C</option>
        </select>
        <Btn><Icon name="check-circle-2" size={15} /> Bulk approve</Btn>
      </Toolbar>
      <Table cols={cols} rows={rows} />
    </div>
  );
}

function Classes() {
  const cols = [{ label: 'Class', w: '1.6fr' }, { label: 'Code', w: '0.9fr' }, { label: 'Teacher', w: '1.4fr' }, { label: 'Students', w: '0.9fr' }, { label: '', w: '1fr' }];
  const rows = [
    [<b>Sunflower 2A</b>, 'SUN2A', 'Katie Tran', '24', <Btn variant="text" style={{ fontSize: 13, padding: 0 }}>Reassign</Btn>],
    [<b>Rainbow 1B</b>, 'RNB1B', 'Hoàng Nam', '21', <Btn variant="text" style={{ fontSize: 13, padding: 0 }}>Reassign</Btn>],
    [<b>Star Class 3C</b>, 'STR3C', 'Katie Tran', '18', <Btn variant="text" style={{ fontSize: 13, padding: 0 }}>Reassign</Btn>],
    [<b>Moon 4A</b>, 'MON4A', <span style={{ color: '#94A3B8' }}>Unassigned</span>, '0', <Btn style={{ padding: '6px 12px', fontSize: 13 }}>Assign teacher</Btn>],
  ];
  return <div><Toolbar search="Search classes…"><Btn><Icon name="plus" size={16} /> New Class</Btn></Toolbar><Table cols={cols} rows={rows} /></div>;
}

function HomeworkOverview() {
  const cols = [{ label: 'Homework', w: '1.8fr' }, { label: 'Teacher', w: '1.2fr' }, { label: 'Type', w: '1fr' }, { label: 'Class', w: '1fr' }, { label: 'Completion', w: '1.2fr' }];
  const bar = (pct, color) => <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1, height: 7, borderRadius: 99, background: '#EEF2F7' }}><div style={{ width: pct + '%', height: '100%', borderRadius: 99, background: color }} /></div><span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', width: 34 }}>{pct}%</span></div>;
  const rows = [
    [<b>CVC words — week 3</b>, 'Katie Tran', <Chip bg="#FFF7ED" color="#F97316"><Icon name="hash" size={12} /> Phonics</Chip>, 'Sunflower 2A', bar(75, '#7BD88F')],
    [<b>Describe the park</b>, 'Hoàng Nam', <Chip bg="#FDF2F8" color="#EC4899"><Icon name="mic" size={12} /> Speaking</Chip>, 'Rainbow 1B', bar(43, '#FFD166')],
    [<b>Animals flashcards</b>, 'Katie Tran', <Chip bg="#F5F3FF" color="#8B5CF6"><Icon name="image" size={12} /> Vocab</Chip>, 'Star Class 3C', bar(78, '#7BD88F')],
    [<b>Morning routine clip</b>, 'Katie Tran', <Chip bg="#ECFEFF" color="#06B6D4"><Icon name="headphones" size={12} /> Listen</Chip>, 'Sunflower 2A', bar(100, '#7BD88F')],
  ];
  return <div><Toolbar search="Search homework…"><select style={{ fontFamily: 'Inter', fontSize: 13, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff' }}><option>All teachers</option><option>Katie Tran</option><option>Hoàng Nam</option></select></Toolbar><Table cols={cols} rows={rows} /></div>;
}

const A_TITLES = {
  dashboard: { t: 'Dashboard', s: 'School-wide overview' },
  teachers: { t: 'Teachers', s: 'Approve, deactivate and manage teacher accounts' },
  classes: { t: 'Classes', s: 'Create classes and assign teachers' },
  students: { t: 'Students', s: 'Filter by class and bulk-approve registrations' },
  homework: { t: 'Homework', s: 'Cross-teacher homework overview' },
};

function AdminApp() {
  const [screen, setScreen] = React.useState('dashboard');
  const m = A_TITLES[screen];
  const body = { dashboard: <AdminDashboard />, teachers: <Teachers />, classes: <Classes />, students: <Students />, homework: <HomeworkOverview /> }[screen];
  return <AdminShell active={screen} onNav={setScreen} title={m.t} subtitle={m.s}>{body}</AdminShell>;
}

Object.assign(window, { AdminApp });

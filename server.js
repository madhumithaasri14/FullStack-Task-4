const express = require('express'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const app = express(), DB = path.join(__dirname, 'db.json'), PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const hash = (p, s) => crypto.scryptSync(p, s, 32).toString('hex');
const save = d => fs.writeFileSync(DB, JSON.stringify(d, null, 2));
function load() {
  if (fs.existsSync(DB)) return JSON.parse(fs.readFileSync(DB));
  const salt = crypto.randomBytes(8).toString('hex');
  const d = { users: [{ id: 1, name: 'Admin', email: 'admin@campus.edu', role: 'admin', salt, pass: hash('admin123', salt) }], complaints: [], seq: { u: 1, c: 0 } };
  save(d); return d;
}

const sessions = new Map();
const auth = (role) => (req, res, next) => {
  const u = sessions.get((req.headers.authorization || '').replace('Bearer ', ''));
  if (!u) return res.status(401).json({ error: 'Please log in' });
  if (role && u.role !== role) return res.status(403).json({ error: 'Not allowed' });
  req.user = u; next();
};
const pub = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const login = (u, res) => { const t = crypto.randomUUID(); sessions.set(t, pub(u)); res.json({ token: t, user: pub(u) }); };

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Name, email and a 6+ character password are required' });
  const d = load();
  if (d.users.some(u => u.email === email.toLowerCase())) return res.status(409).json({ error: 'Email already registered' });
  const salt = crypto.randomBytes(8).toString('hex');
  const u = { id: ++d.seq.u, name: name.trim(), email: email.toLowerCase(), role: 'student', salt, pass: hash(password, salt) };
  d.users.push(u); save(d); login(u, res);
});

app.post('/api/login', (req, res) => {
  const { email = '', password = '' } = req.body;
  const u = load().users.find(x => x.email === email.toLowerCase());
  if (!u || hash(password, u.salt) !== u.pass) return res.status(401).json({ error: 'Invalid email or password' });
  login(u, res);
});

app.get('/api/complaints', auth(), (req, res) => {
  const all = load().complaints;
  res.json((req.user.role === 'admin' ? all : all.filter(c => c.userId === req.user.id)).slice().reverse());
});

app.post('/api/complaints', auth('student'), (req, res) => {
  const { title, category, description, priority } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description are required' });
  const d = load(), now = new Date().toISOString();
  const c = { id: ++d.seq.c, userId: req.user.id, userName: req.user.name, title: title.trim(), category: category || 'Other',
    description: description.trim(), priority: priority || 'Medium', status: 'Pending', response: '', createdAt: now, updatedAt: now };
  d.complaints.push(c); save(d); res.status(201).json(c);
});

app.patch('/api/complaints/:id', auth('admin'), (req, res) => {
  const d = load(), c = d.complaints.find(x => x.id === +req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (['Pending', 'In Progress', 'Resolved', 'Rejected'].includes(req.body.status)) c.status = req.body.status;
  if (typeof req.body.response === 'string') c.response = req.body.response;
  c.updatedAt = new Date().toISOString(); save(d); res.json(c);
});

app.delete('/api/complaints/:id', auth(), (req, res) => {
  const d = load(), c = d.complaints.find(x => x.id === +req.params.id);
  if (!c || (req.user.role !== 'admin' && (c.userId !== req.user.id || c.status !== 'Pending'))) return res.status(403).json({ error: 'Cannot delete' });
  d.complaints = d.complaints.filter(x => x.id !== c.id); save(d); res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Campus Complaint System running at http://localhost:${PORT}`));

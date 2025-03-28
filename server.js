// server.js (Full version with MongoDB)
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb+srv://zwright134:ytrSF4yXMzrJ0dYY@signalhivecluster.z704jfh.mongodb.net/signalhive?retryWrites=true&w=majority&appName=SignalHiveCluster', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Error:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'signalhive-secret',
  resave: false,
  saveUninitialized: false
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Auth middleware
function checkAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

app.get('/pricing', (req, res) => {
  res.render('pricing', { user: req.session.user });
});

app.get('/dashboard', checkAuth, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  const signals = user.role === 'Drone' ? [] : [
    { pair: 'EUR/USD', action: 'BUY', entry: '1.0852', sl: '1.0830', tp: '1.0885', confidence: '87%' },
    { pair: 'GBP/USD', action: 'SELL', entry: '1.2430', sl: '1.2455', tp: '1.2380', confidence: '76%' }
  ];
  const trialActive = user.trialExpires && Date.now() < new Date(user.trialExpires).getTime();
  res.render('dashboard', { user, signals, trialActive });
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { error: 'Invalid credentials' });
  }
  req.session.user = user;
  res.redirect('/dashboard');
});

app.get('/register', (req, res) => {
  res.render('register', { ref: req.query.ref });
});

app.post('/register', async (req, res) => {
  const { email, password, ref } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.render('register', { ref: null, error: 'Email already exists' });
  const hashedPassword = await bcrypt.hash(password, 10);
  const referralCode = Buffer.from(email).toString('base64');
  const referredBy = ref || null;

  const newUser = new User({ email, password: hashedPassword, referralCode, referredBy });
  await newUser.save();

  if (ref) {
    const referrer = await User.findOne({ referralCode: ref });
    if (referrer) {
      referrer.referralsCount++;
      await referrer.save();
    }
  }

  req.session.user = newUser;
  res.redirect('/dashboard');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/referral-link', checkAuth, async (req, res) => {
  const user = await User.findById(req.session.user._id);
  const refLink = `${req.protocol}://${req.get('host')}/register?ref=${user.referralCode}`;
  res.send(`Your referral link: <a href="${refLink}">${refLink}</a>`);
});

app.get('/upgrade', checkAuth, (req, res) => {
  res.render('upgrade', { user: req.session.user });
});

app.post('/upgrade', checkAuth, async (req, res) => {
  const { newRole } = req.body;
  const user = await User.findById(req.session.user._id);
  user.role = newRole;
  await user.save();
  req.session.user = user;
  res.redirect('/dashboard');
});

app.listen(PORT, () => {
  console.log(`🚀 SignalHive running on port ${PORT}`);
});

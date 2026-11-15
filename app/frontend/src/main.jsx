import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router';
import './styles.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const LibraryContext = createContext(null);
const useLibrary = () => useContext(LibraryContext);

async function api(path, { token, ...options } = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body;
}

function LibraryProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('library-token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('library-user') || 'null'); } catch { return null; }
  });
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loans, setLoans] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('library-favorites') || '[]'));
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refreshBooks() {
    setLoadingBooks(true);
    try {
      const [catalogue, categoryList] = await Promise.all([api('/books'), api('/categories')]);
      setBooks(catalogue); setCategories(categoryList);
    } catch (err) { setError(err.message); }
    finally { setLoadingBooks(false); }
  }

  async function refreshAccount(activeToken = token) {
    if (!activeToken) { setLoans([]); setPurchases([]); return; }
    try {
      const [accountLoans, accountPurchases] = await Promise.all([
        api('/loans', { token: activeToken }), api('/purchases', { token: activeToken }),
      ]);
      setLoans(accountLoans); setPurchases(accountPurchases);
    } catch (err) {
      if (err.message.toLowerCase().includes('session')) signOut();
      else setError(err.message);
    }
  }

  useEffect(() => { refreshBooks(); }, []);
  useEffect(() => { refreshAccount(); }, [token]);

  function signIn(payload) {
    localStorage.setItem('library-token', payload.token);
    localStorage.setItem('library-user', JSON.stringify(payload.user));
    setToken(payload.token); setUser(payload.user);
  }

  function signOut() {
    if (token) api('/auth/logout', { method: 'POST', token }).catch(() => {});
    localStorage.removeItem('library-token'); localStorage.removeItem('library-user');
    setToken(null); setUser(null); setLoans([]); setPurchases([]);
  }

  async function performBookAction(book, action) {
    if (!token) return setError('Please log in to continue.');
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(`/books/${book.id}/${action}`, { method: 'POST', token });
      setNotice(result.message);
      await Promise.all([refreshBooks(), refreshAccount(token)]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function returnBook(loan) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(`/loans/${loan.id}/return`, { method: 'POST', token });
      setNotice(result.message);
      await Promise.all([refreshBooks(), refreshAccount(token)]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function toggleFavorite(bookId) {
    setFavorites((current) => {
      const next = current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId];
      localStorage.setItem('library-favorites', JSON.stringify(next));
      return next;
    });
  }

  const value = useMemo(() => ({ token, user, books, categories, loans, purchases, favorites, loadingBooks, busy, error, notice,
    setError, setNotice, signIn, signOut, performBookAction, returnBook, toggleFavorite }),
  [token, user, books, categories, loans, purchases, favorites, loadingBooks, busy, error, notice]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

function App() {
  return <LibraryProvider><Routes>
    <Route path="/" element={<LandingRedirect />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<LibraryShell />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/shelf" element={<ShelfPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
      </Route>
    </Route>
    <Route path="*" element={<LandingRedirect />} />
  </Routes></LibraryProvider>;
}

function LandingRedirect() {
  const { token } = useLibrary();
  return <Navigate to={token ? '/home' : '/login'} replace />;
}

function ProtectedRoute() {
  const { token } = useLibrary();
  const location = useLocation();
  return token ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function Brand({ inverse = false }) {
  return <Link className={`brand ${inverse ? 'brand-inverse' : ''}`} to="/home"><span className="brand-icon"><BookIcon /></span><span>Biblio<span>Hub</span></span></Link>;
}

const navItems = [
  { to: '/home', label: 'Home', icon: '⌂', end: true },
  { to: '/catalog', label: 'Browse Catalog', icon: '▦' },
  { to: '/shelf', label: 'My Shelf', icon: '▯', count: 'loans' },
  { to: '/purchases', label: 'My Purchases', icon: '▤' },
  { to: '/favorites', label: 'Favorites', icon: '♡' },
];

function LibraryShell() {
  const { user, signOut, error, notice, setError, setNotice, loans } = useLibrary();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  function search(event) {
    event.preventDefault();
    navigate(`/catalog?q=${encodeURIComponent(query)}`);
    setMenuOpen(false);
  }
  return <div className="hub-layout">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <Brand inverse />
      <p className="nav-caption">YOUR LIBRARY</p>
      <nav className="side-nav">{navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}><span className="nav-icon">{item.icon}</span>{item.label}{item.count === 'loans' && loans.some((loan) => loan.status === 'active') && <span className="nav-count">{loans.filter((loan) => loan.status === 'active').length}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="note-star">✦</span><strong>A world of stories</strong><p>Your next favourite is waiting on the shelf.</p><Link to="/catalog" onClick={() => setMenuOpen(false)}>Explore books <span>↗</span></Link></div><button className="nav-link logout-link" onClick={() => { signOut(); navigate('/login'); }}><span className="nav-icon">↪</span>Log out</button></div>
    </aside>
    {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <section className="hub-main">
      <header className="hub-topbar"><button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label="Open navigation">☰</button><form className="global-search" onSubmit={search}><span>⌕</span><input aria-label="Search books" placeholder="Search titles, authors..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>↵</kbd></form><div className="topbar-user"><Link to="/purchases" className="history-shortcut" title="Purchase history">♧</Link><Link to="/favorites" className="top-fav" title="Favorites">♡</Link><span className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'R'}</span><span className="top-user-name">{user?.name?.split(' ')[0] || 'Reader'}</span></div></header>
      <main className="page-content">{error && <div className="toast toast-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}{notice && <div className="toast toast-success" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}<Outlet /></main>
      <footer className="hub-footer"><span>© 2026 BiblioHub</span><span>A little more room to read.</span></footer>
    </section>
  </div>;
}

function PageTitle({ eyebrow, title, subtitle, action }) {
  return <div className="page-title-row"><div><p className="page-eyebrow">{eyebrow}</p><h1>{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>{action}</div>;
}

function HomePage() {
  const { user, books, loans, purchases, favorites, loadingBooks } = useLibrary();
  const activeLoans = loans.filter((loan) => loan.status === 'active');
  const featured = books.slice(0, 3);
  return <div className="page home-page">
    <section className="welcome-banner"><div><span className="page-eyebrow">YOUR PERSONAL READING SPACE</span><h1>Welcome back, {user?.name?.split(' ')[0]} <span>✦</span></h1><p>Ready to find where the next story takes you?</p><Link className="button button-light" to="/catalog">Explore the catalog <span>↗</span></Link></div><div className="welcome-illustration"><div className="welcome-orbit orbit-one"></div><div className="welcome-orbit orbit-two"></div><span className="welcome-leaf">✳</span><img src="https://covers.openlibrary.org/b/title/The%20Midnight%20Library-L.jpg" alt="The Midnight Library cover" /></div></section>
    <div className="stats-row"><StatCard icon="▦" label="Books to explore" value={loadingBooks ? '—' : books.length} /><StatCard icon="▯" label="On your shelf" value={activeLoans.length} /><StatCard icon="▤" label="Books purchased" value={purchases.length} /><StatCard icon="♡" label="Your favorites" value={favorites.length} /></div>
    <section className="content-section"><div className="section-header"><div><p className="page-eyebrow">HAND-PICKED FOR YOU</p><h2>Explore & discover</h2></div><Link className="subtle-link" to="/catalog">Browse all books <span>→</span></Link></div><div className="book-grid">{featured.map((book, index) => <BookCard key={book.id} book={book} variant={index} />)}</div>{!loadingBooks && !featured.length && <EmptyState title="The shelves are quiet" text="Books will appear here once they are added to the catalog." />}</section>
    <section className="home-bottom-grid"><div className="mini-panel"><div className="section-header"><div><p className="page-eyebrow">KEEP READING</p><h2>My active shelf</h2></div><Link className="subtle-link" to="/shelf">See shelf →</Link></div>{activeLoans.length ? activeLoans.slice(0, 2).map((loan) => <div className="mini-loan" key={loan.id}><span className="mini-book-icon">▤</span><div><strong>{loan.bookTitle}</strong><small>Borrowed {new Date(loan.createdAt).toLocaleDateString()}</small></div><span className="reading-pill">Reading</span></div>) : <p className="muted-copy">Your shelf is ready for a new story.</p>}</div><div className="quote-panel"><span>“</span><p>A reader lives a thousand lives before he dies.</p><small>— George R. R. Martin</small><div className="quote-dots">✳ &nbsp; ✳ &nbsp; ✳</div></div></section>
  </div>;
}

function StatCard({ icon, label, value }) { return <div className="stat-card"><span className="stat-icon">{icon}</span><span className="stat-value">{value}</span><span className="stat-label">{label}</span></div>; }

function CatalogPage() {
  const { books, categories, loadingBooks } = useLibrary();
  const [params, setParams] = useSearchParams();
  const [category, setCategory] = useState('All');
  const query = params.get('q') || '';
  const filtered = books.filter((book) => {
    const matchesText = `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (category === 'All' || book.category === category);
  });
  return <div className="page"><PageTitle eyebrow="THE COLLECTION" title="Browse catalog" subtitle="Find a new favourite among the stories on our shelves." />
    <div className="catalog-toolbar"><div className="category-pills"><button className={category === 'All' ? 'category-pill selected' : 'category-pill'} onClick={() => setCategory('All')}>All books</button>{categories.map((item) => <button key={item} className={category === item ? 'category-pill selected' : 'category-pill'} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="catalog-search"><span>⌕</span><input value={query} onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {})} placeholder="Search this collection" /><button onClick={() => setParams({})} aria-label="Clear search">×</button></label></div>
    {loadingBooks ? <LoadingState /> : filtered.length ? <div className="book-grid catalog-grid">{filtered.map((book, index) => <BookCard key={book.id} book={book} variant={index} />)}</div> : <EmptyState title="No books found" text="Try another title, author, or category." />}
  </div>;
}

function BookCard({ book, variant = 0 }) {
  const { favorites, toggleFavorite, performBookAction, busy } = useLibrary();
  const favorite = favorites.includes(book.id);
  return <article className="book-card"><div className={`book-cover book-cover-${variant % 4}`}><img src={book.coverImage} alt={`Cover of ${book.title}`} loading="lazy" /><span className="book-genre">{book.category}</span><button className={`favorite-button ${favorite ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(book.id)} aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}>{favorite ? '♥' : '♡'}</button></div><div className="book-details"><div className="book-heading"><div><h3>{book.title}</h3><p>by {book.author}</p></div><strong>${Number(book.price).toFixed(2)}</strong></div><div className="book-stock"><span className={book.availableQuantity ? 'stock-dot' : 'stock-dot stock-empty'}></span>{book.availableQuantity ? `${book.availableQuantity} available` : 'Join the return queue'}</div><div className="book-buttons"><button className="button button-teal" disabled={!book.availableQuantity || busy} onClick={() => performBookAction(book, 'borrow')}>Borrow <span>↗</span></button><button className="button button-blue" disabled={!book.availableQuantity || busy} onClick={() => performBookAction(book, 'buy')}>Buy · ${Number(book.price).toFixed(2)}</button></div></div></article>;
}

function ShelfPage() {
  const { loans, returnBook, busy } = useLibrary();
  const active = loans.filter((loan) => loan.status === 'active');
  const returned = loans.filter((loan) => loan.status === 'returned');
  return <div className="page"><PageTitle eyebrow="YOUR READING DESK" title="My shelf" subtitle="Books you have borrowed, all in one place." action={<span className="page-count">{active.length} active {active.length === 1 ? 'book' : 'books'}</span>} />
    <section className="content-section shelf-section"><div className="section-header"><div><p className="page-eyebrow">CURRENTLY BORROWED</p><h2>On your bedside table</h2></div></div>{active.length ? <div className="shelf-list">{active.map((loan, index) => <div className="shelf-item" key={loan.id}><div className={`shelf-cover shelf-cover-${index % 4}`}><span>▤</span></div><div className="shelf-info"><p className="page-eyebrow">BORROWED {new Date(loan.createdAt).toLocaleDateString()}</p><h3>{loan.bookTitle}</h3><p>Enjoy your read, and return it when you’re ready to share it with another reader.</p></div><span className="status-chip">On your shelf</span><button className="button button-outline" disabled={busy} onClick={() => returnBook(loan)}>Return book <span>↗</span></button></div>)}</div> : <EmptyState title="Your shelf is waiting" text="Browse the catalog and borrow a book to see it here." link="/catalog" linkText="Find a book" />}</section>
    {returned.length > 0 && <section className="content-section history-section"><div className="section-header"><div><p className="page-eyebrow">PAST READS</p><h2>Returned books</h2></div></div><div className="history-list">{returned.map((loan) => <div className="history-row" key={loan.id}><span className="history-check">✓</span><strong>{loan.bookTitle}</strong><span>Returned {new Date(loan.returnedAt).toLocaleDateString()}</span></div>)}</div></section>}
  </div>;
}

function PurchasesPage() {
  const { purchases, books } = useLibrary();
  return <div className="page"><PageTitle eyebrow="YOUR BOOKSHOP" title="My purchases" subtitle="Your purchase history, saved here for easy reference." action={<Link className="button button-blue" to="/catalog">Browse books <span>↗</span></Link>} />
    {purchases.length ? <div className="purchase-list">{purchases.map((purchase, index) => { const book = books.find((item) => item.title === purchase.bookTitle); return <article className="purchase-card" key={purchase.id}><div className={`purchase-cover purchase-cover-${index % 4}`}>{book?.coverImage && <img src={book.coverImage} alt="" />}</div><div className="purchase-info"><p className="page-eyebrow">PURCHASE RECORDED</p><h2>{purchase.bookTitle}</h2><p>{new Date(purchase.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p></div><span className="purchase-check">✓ Complete</span></article>; })}</div> : <EmptyState title="No purchases yet" text="Books you buy will be listed here. Purchases are recorded in your account; no payment is processed." link="/catalog" linkText="Browse the catalog" />}
    <p className="fine-print">Purchases are recorded for library tracking. No payment service is connected.</p>
  </div>;
}

function FavoritesPage() {
  const { books, favorites } = useLibrary();
  const saved = books.filter((book) => favorites.includes(book.id));
  return <div className="page"><PageTitle eyebrow="YOUR PERSONAL SHORTLIST" title="Favorites" subtitle="Keep the books you’re curious about close by." action={<span className="page-count">{saved.length} saved</span>} />
    {saved.length ? <div className="book-grid catalog-grid">{saved.map((book, index) => <BookCard key={book.id} book={book} variant={index} />)}</div> : <EmptyState title="A few books caught your eye?" text="Tap the heart on a book cover to save it here." link="/catalog" linkText="Find your next read" />}
  </div>;
}

function EmptyState({ title, text, link, linkText }) {
  return <div className="empty-state"><span className="empty-icon">✧</span><h2>{title}</h2><p>{text}</p>{link && <Link className="button button-teal" to={link}>{linkText} <span>↗</span></Link>}</div>;
}

function LoadingState() { return <div className="loading-state"><span className="loading-spinner"></span>Opening the shelves…</div>; }
function AuthPage({ mode }) {
  const { signIn, setError, error, notice, setNotice } = useLibrary();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isRegister = mode === 'register';
  const registrationNotice = location.state?.notice;

  async function handleSubmit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (isRegister) {
        await api('/auth/register', { method: 'POST', body: JSON.stringify(values) });
        navigate('/login', { state: { notice: 'Your library account is ready. Please sign in.' } });
      } else {
        const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(values) });
        signIn(result); navigate(location.state?.from || '/home', { replace: true });
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-art-panel"><Brand /><div className="auth-art-copy"><span className="page-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h1>Good stories<br />find their <em>people.</em></h1><p>Discover new worlds, borrow a little wonder, and bring your favourite pages home.</p></div><div className="auth-art-books"><div className="auth-circle"></div><img className="auth-book-one" src="https://covers.openlibrary.org/b/title/The%20Midnight%20Library-L.jpg" alt="The Midnight Library" /><img className="auth-book-two" src="https://covers.openlibrary.org/b/title/Dune-L.jpg" alt="Dune" /><span className="auth-art-spark">✳</span></div><p className="auth-art-footer">A BiblioHub reader is never alone in a story.</p></section>
    <section className="auth-form-panel"><div className="auth-top-link">{isRegister ? <>Already a member? <Link to="/login">Sign in</Link></> : <>New to BiblioHub? <Link to="/register">Create an account</Link></>}</div><div className="auth-card"><div className="auth-mobile-brand"><Brand /></div><div className="auth-logo-mark"><BookIcon /></div><p className="page-eyebrow">{isRegister ? 'JOIN THE COMMUNITY' : 'WELCOME BACK, READER'}</p><h2>{isRegister ? 'Create your account' : 'Your next chapter awaits.'}</h2><p className="auth-intro">{isRegister ? 'Make a little space for more stories.' : 'Log in to your library and bookstore.'}</p>
      {(error || registrationNotice || notice) && <div className={error ? 'auth-message auth-message-error' : 'auth-message'} role={error ? 'alert' : 'status'}>{error || registrationNotice || notice}<button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss">×</button></div>}
      <form className="auth-form" onSubmit={handleSubmit}>{isRegister && <label>Full name<input type="text" name="name" autoComplete="name" placeholder="Your name" required maxLength="100" /></label>}<label>Email address<input type="email" name="email" autoComplete="email" placeholder="reader@example.com" required /></label><label>Password<span className="password-wrap"><input type={showPassword ? 'text' : 'password'} name="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'} required minLength={isRegister ? 8 : undefined} /><button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? '◉' : '◎'}</button></span></label>{!isRegister && <div className="remember-row"><label><input type="checkbox" /> Remember me</label><span>Password help? Ask your library team.</span></div>}<button className="button button-navy auth-submit" disabled={busy}>{busy ? 'One moment…' : isRegister ? 'Create account' : 'Sign in'} <span>↗</span></button></form><p className="auth-terms">{isRegister ? 'By joining, you agree to be kind to your books.' : 'Your reading life is right where you left it.'}</p></div><p className="auth-copyright">© 2026 BiblioHub · Made for people who love a good story</p></section></main>;
}

function BookIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H21v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 4.5v17M8.5 6H17"/></svg>; }

createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>);

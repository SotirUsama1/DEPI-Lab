import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

async function api(path, { token, ...options } = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('library-token'));
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('library-user') || 'null'));
  const [books, setBooks] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loans, setLoans] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All books');
  const [authMode, setAuthMode] = useState('login');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBooks = async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (category !== 'All books') params.set('category', category);
    setLoading(true);
    try { setBooks(await api(`/books?${params}`)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const loadAccountLists = async (activeToken = token) => {
    if (!activeToken) { setLoans([]); setPurchases([]); return; }
    try {
      const [nextLoans, nextPurchases] = await Promise.all([
        api('/loans', { token: activeToken }), api('/purchases', { token: activeToken }),
      ]);
      setLoans(nextLoans); setPurchases(nextPurchases);
    } catch (err) { if (err.message.includes('session')) signOut(); else setError(err.message); }
  };

  useEffect(() => { loadBooks(); }, [search, category]);
  useEffect(() => { api('/categories').then(setAllCategories).catch((err) => setError(err.message)); }, []);
  useEffect(() => { loadAccountLists(); }, [token]);

  const categories = useMemo(() => ['All books', ...allCategories], [allCategories]);
  const activeLoans = loans.filter((loan) => loan.status === 'active');

  function signIn(payload) {
    localStorage.setItem('library-token', payload.token);
    localStorage.setItem('library-user', JSON.stringify(payload.user));
    setToken(payload.token); setUser(payload.user);
  }

  async function signOut() {
    if (token) api('/auth/logout', { method: 'POST', token }).catch(() => {});
    localStorage.removeItem('library-token'); localStorage.removeItem('library-user');
    setToken(null); setUser(null); setNotice('You have been logged out.');
  }

  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      if (authMode === 'register') {
        await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
        setNotice('Your account is ready. Please log in.'); setAuthMode('login');
      } else {
        const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
        signIn(result); setNotice(`Welcome back, ${result.user.name}.`);
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function bookAction(book, action) {
    if (!token) { setError('Please log in to borrow or buy a book.'); document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' }); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(`/books/${book.id}/${action}`, { method: 'POST', token });
      setNotice(result.message); await Promise.all([loadBooks(), loadAccountLists()]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function returnBook(loan) {
    setBusy(true); setError('');
    try {
      const result = await api(`/loans/${loan.id}/return`, { method: 'POST', token });
      setNotice(result.message); await Promise.all([loadBooks(), loadAccountLists()]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <>
    <header className="topbar">
      <a className="brand" href="#home"><span className="brand-mark">C</span><span>chapter <i>& co.</i></span></a>
      <nav><a href="#catalogue">The collection</a><a href="#about">Our library</a></nav>
      <div className="top-actions">
        {user ? <><span className="welcome">Hello, {user.name.split(' ')[0]}</span><a className="outline-button" href="#account">My account</a><button className="text-button" onClick={signOut}>Log out</button></> : <><a className="text-button" href="#account">Log in</a><a className="dark-button" href="#account">Join the library <span>↗</span></a></>}
      </div>
    </header>

    <main id="home">
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow"><span></span> A little more room to read</p><h1>Find your next<br /><em>favourite</em> chapter.</h1><p className="hero-lede">A neighbourhood library for curious minds. Discover stories worth keeping and ideas worth sharing.</p><a href="#catalogue" className="dark-button hero-button">Explore the collection <span>↓</span></a><div className="hero-note"><span className="avatars">M&nbsp; A&nbsp; J</span><span>Loved by readers in every chapter of life</span></div></div>
        <div className="hero-art"><div className="sun"></div><img className="hero-book" src="https://covers.openlibrary.org/b/title/The%20Secret%20Garden-L.jpg" alt="The Secret Garden book cover" /><div className="hero-caption"><span>01 / THE CLASSICS</span><span>Stories that stay with you</span></div><span className="art-spark">✳</span></div>
      </section>

      <section className="marquee"><span>READ A LITTLE MORE</span><b>✳</b><span>MAKE ROOM FOR WONDER</span><b>✳</b><span>READ A LITTLE MORE</span><b>✳</b></section>

      <section className="catalogue section-wrap" id="catalogue">
        <div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2>Good books, <em>good company.</em></h2></div><p className="section-intro">Browse the shelves and find something that speaks to you.</p></div>
        <div className="catalogue-controls"><div className="filters">{categories.map((item) => <button key={item} className={category === item ? 'filter active' : 'filter'} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a book or author" /></label></div>
        {error && <div className="alert error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
        {notice && <div className="alert success" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
        <div className="book-grid">{loading ? <p className="empty">Opening the shelves…</p> : books.length ? books.map((book, index) => <article className="book-card" key={book.id}>
          <div className={`cover cover-${index % 4}`}><img src={book.coverImage} alt={`Cover of ${book.title}`} loading="lazy" /><span className="category-tag">{book.category}</span></div>
          <div className="book-info"><div><h3>{book.title}</h3><p className="author">by {book.author}</p></div><span className="price">${book.price.toFixed(2)}</span></div>
          <p className={book.availableQuantity ? 'availability' : 'availability unavailable'}><span></span>{book.availableQuantity ? `${book.availableQuantity} of ${book.totalQuantity} available` : 'Currently all borrowed'}</p>
          <div className="book-actions"><button disabled={!book.availableQuantity || busy} onClick={() => bookAction(book, 'borrow')}>Borrow a copy <span>↗</span></button><button disabled={!book.availableQuantity || busy} onClick={() => bookAction(book, 'buy')}>Buy <span>${book.price.toFixed(2)}</span></button></div>
        </article>) : <p className="empty">No books found. Try another search.</p>}</div>
      </section>

      <section className="account-section" id="account"><div className="account-inner">
        <div className="account-copy"><p className="eyebrow">YOUR READING LIFE</p><h2>{user ? `A shelf of your own, ${user.name.split(' ')[0]}.` : <>A library card<br /><em>looks good on you.</em></>}</h2><p>{user ? 'Keep an eye on your current loans and the books you have purchased.' : 'Join our community of readers. Your next great read is waiting.'}</p></div>
        <div className="account-panel">
          {error && <div className="alert error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
          {notice && <div className="alert success" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
          {user ? <>
          <div className="account-heading"><div><span className="eyebrow">YOUR ACCOUNT</span><h3>{user.name}</h3><p>{user.email}</p></div></div>
          <div className="account-list"><div className="list-title"><h4>On your bedside table</h4><span>{activeLoans.length} active</span></div>{activeLoans.length ? activeLoans.map((loan) => <div className="loan-row" key={loan.id}><span>↗</span><div><strong>{loan.bookTitle}</strong><small>Borrowed {new Date(loan.createdAt).toLocaleDateString()}</small></div><button disabled={busy} onClick={() => returnBook(loan)}>Return book</button></div>) : <p className="small-empty">No active loans. Browse the collection to borrow something.</p>}</div>
          <div className="account-list"><div className="list-title"><h4>Books you have bought</h4><span>{purchases.length}</span></div>{purchases.length ? purchases.map((purchase) => <div className="purchase-row" key={purchase.id}><span>✓</span><strong>{purchase.bookTitle}</strong><small>{new Date(purchase.createdAt).toLocaleDateString()}</small></div>) : <p className="small-empty">Your purchase list is empty.</p>}</div>
        </> : <>
          <div className="auth-tabs"><button className={authMode === 'login' ? 'selected' : ''} onClick={() => { setAuthMode('login'); setError(''); }}>Log in</button><button className={authMode === 'register' ? 'selected' : ''} onClick={() => { setAuthMode('register'); setError(''); }}>Create an account</button></div>
          <form className="auth-form" onSubmit={submitAuth}>{authMode === 'register' && <label>Your name<input name="name" type="text" autoComplete="name" placeholder="Alex Reader" required maxLength="100" /></label>}<label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Password<input name="password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" required minLength="8" /></label><button className="dark-button submit-button" disabled={busy}>{busy ? 'One moment…' : authMode === 'login' ? 'Log in to your account' : 'Create my library account'} <span>↗</span></button><p className="form-note">Your account is free. No payment details needed.</p></form>
        </>}</div>
      </div></section>

      <section className="about section-wrap" id="about"><div className="about-mark">C.</div><div><p className="eyebrow">A PLACE FOR EVERY STORY</p><h2>More than shelves.<br /><em>A shared little world.</em></h2></div><p className="about-text">We believe the best things happen when a good book finds the right person. Browse, borrow, return, and keep discovering—one chapter at a time.</p></section>
    </main>
    <footer><a className="brand" href="#home"><span className="brand-mark">C</span><span>chapter <i>& co.</i></span></a><span>Made for readers, wherever you are.</span><a href="#home">Back to the top ↑</a></footer>
  </>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

import {
  Activity,
  ChevronDown,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/useAuth'
import ProfileAvatar from './ProfileAvatar'
// Retains SECURA's already-approved circular theme-wave transition CSS.
import './AdminNeo.css'
import '../pages/security/SecurityNeo.css'

const links = [
  { to: '/security/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/security/reviews', label: 'Access reviews', icon: ClipboardCheck },
  { to: '/security/alerts', label: 'Alerts', icon: Activity },
  { to: '/security/logs', label: 'Audit logs', icon: FileText },
]

const readTheme = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'

export default function SecurityNeoSidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState(readTheme)
  const [menuOpen, setMenuOpen] = useState(false)
  const name = user?.full_name || user?.username || 'Security Officer'

  const toggleTheme = (event) => {
    const root = document.documentElement
    const next = root.dataset.theme === 'light' ? 'dark' : 'light'
    const apply = () => {
      root.dataset.theme = next
      try { localStorage.setItem('secura-theme', next) } catch { /* optional storage */ }
      flushSync(() => setTheme(next))
    }
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reducedMotion) { apply(); return }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.ceil(Math.max(
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y),
    ))
    root.style.setProperty('--theme-transition-x', `${x}px`)
    root.style.setProperty('--theme-transition-y', `${y}px`)
    root.style.setProperty('--theme-transition-radius', `${radius}px`)
    root.classList.add('secura-theme-transitioning', 'secura-neo-theme-wave')
    try {
      const transition = document.startViewTransition(apply)
      void transition.finished.catch(() => {}).finally(() => {
        root.classList.remove('secura-theme-transitioning', 'secura-neo-theme-wave')
      })
    } catch {
      root.classList.remove('secura-theme-transitioning', 'secura-neo-theme-wave')
      apply()
    }
  }

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="secura-soc-nav">
      <div className="secura-soc-nav__inner">
        <Link to="/security/dashboard" className="secura-soc-nav__brand" aria-label="SECURA Security Officer home" onClick={() => setMenuOpen(false)}>
          <span className="secura-soc-nav__logo"><ShieldCheck size={23} /></span>
          <span><b>SECURA</b><small>SECURITY OPERATIONS</small></span>
        </Link>

        <nav className={`secura-soc-nav__links${menuOpen ? ' is-open' : ''}`} aria-label="Security Officer pages" id="secura-soc-pages">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `secura-soc-nav__link${isActive ? ' is-active' : ''}`}>
              <Icon size={16} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="secura-soc-nav__tools">
          <button type="button" className="secura-soc-nav__theme" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            <i aria-hidden="true"><em /></i>
          </button>
          <Link to="/security/profile" className="secura-soc-nav__account" aria-label={`My profile, ${name}`} title="My profile" onClick={() => setMenuOpen(false)}>
            <ProfileAvatar name={name} className="secura-soc-nav__avatar" />
            <span><b>{name}</b><small>Security Officer</small></span>
            <ChevronDown size={13} aria-hidden="true" />
          </Link>
          <button type="button" className="secura-soc-nav__logout" onClick={signOut} aria-label="Log out" title="Log out"><LogOut size={18} /></button>
          <button type="button" className="secura-soc-nav__menu" onClick={() => setMenuOpen((value) => !value)} aria-controls="secura-soc-pages" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  )
}

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  UserCircle2,
  UsersRound,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/useAuth'
import ProfileAvatar from './ProfileAvatar'
import './AdminNeo.css'

const navigationItems = [
  { path: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/admin/users', label: 'User management', icon: UsersRound },
  { path: '/admin/departments', label: 'Departments', icon: Building2 },
  { path: '/admin/profile', label: 'My profile', icon: UserCircle2 },
]

function initialCollapsed() {
  try {
    return window.localStorage.getItem('secura-admin-nav-mini') === 'yes'
  } catch {
    return false
  }
}

function initialTheme() {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function AdminNeoSidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState(initialTheme)
  const displayName = user?.full_name || user?.username || 'Administrator'

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try {
      window.localStorage.setItem('secura-admin-nav-mini', next ? 'yes' : 'no')
    } catch {
      // Sidebar remains usable even when storage is unavailable.
    }
  }

  // Same circular/wave reveal used in SECURA's previous theme transition.
  // The new theme spreads from the switch in the lower-left sidebar.
  const toggleTheme = (event) => {
    const root = document.documentElement
    const next = root.dataset.theme === 'light' ? 'dark' : 'light'
    const applyTheme = () => {
      root.dataset.theme = next
      try {
        window.localStorage.setItem('secura-theme', next)
      } catch {
        // Browser storage is optional.
      }
      flushSync(() => setTheme(next))
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduceMotion) {
      applyTheme()
      return
    }

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
    root.classList.add('secura-theme-transitioning')
    root.classList.add('secura-neo-theme-wave')

    try {
      const transition = document.startViewTransition(() => applyTheme())
      void transition.finished.catch(() => {}).finally(() => {
        root.classList.remove('secura-theme-transitioning')
        root.classList.remove('secura-neo-theme-wave')
      })
    } catch {
      root.classList.remove('secura-theme-transitioning')
      root.classList.remove('secura-neo-theme-wave')
      applyTheme()
    }
  }

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const renderLink = (item) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.path}
        end={item.end}
        to={item.path}
        title={collapsed ? item.label : undefined}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) => `secura-neo-nav__link${isActive ? ' is-active' : ''}`}
      >
        <span className="secura-neo-nav__icon"><Icon size={19} strokeWidth={1.9} /></span>
        <span className="secura-neo-nav__label">{item.label}</span>
        <ChevronRight className="secura-neo-nav__arrow" size={15} aria-hidden="true" />
      </NavLink>
    )
  }

  return (
    <>
      <button
        className="secura-neo-nav__mobile-trigger"
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open admin navigation"
      >
        <Menu size={23} /><span>Menu</span>
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="secura-neo-nav__overlay"
          aria-label="Close admin navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`secura-neo-nav${collapsed ? ' is-mini' : ''}${mobileOpen ? ' is-open' : ''}`}
        aria-label="Administrator navigation"
      >
        <div className="secura-neo-nav__ambient" aria-hidden="true" />
        <div className="secura-neo-nav__top">
          <Link
            to="/admin/dashboard"
            className="secura-neo-nav__brand"
            onClick={() => setMobileOpen(false)}
            aria-label="SECURA home"
          >
            <span className="secura-neo-nav__logo"><ShieldCheck size={21} /></span>
            <span className="secura-neo-nav__brand-copy">
              <b>SECURA<span>.</span></b>
              <small>SMART SECURITY WORKSPACE</small>
            </span>
          </Link>
          <button
            type="button"
            className="secura-neo-nav__close-mobile"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          ><X size={20} /></button>
        </div>

        <div className="secura-neo-nav__collapse-wrap">
          <button
            type="button"
            className="secura-neo-nav__collapse"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="secura-neo-nav__group-name">WORKSPACE</div>
        <nav className="secura-neo-nav__links" aria-label="Administrator workspace">
          {navigationItems.map(renderLink)}
        </nav>

        <div className="secura-neo-nav__bottom">
          <button
            type="button"
            className="secura-neo-nav__glass-toggle"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label={`Dark mode ${theme === 'dark' ? 'on' : 'off'}. Toggle appearance`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={toggleTheme}
          >
            <span className="secura-neo-nav__glass-title">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            <span className={`secura-neo-nav__glass-track${theme === 'dark' ? ' is-dark' : ' is-light'}`} aria-hidden="true">
              <Sun className="secura-neo-nav__glass-icon secura-neo-nav__glass-icon--sun" size={16} />
              <Moon className="secura-neo-nav__glass-icon secura-neo-nav__glass-icon--moon" size={16} />
              <span className="secura-neo-nav__glass-thumb">
                {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              </span>
            </span>
          </button>

          <div className="secura-neo-nav__identity">
            <div className="secura-neo-nav__profile secura-neo-nav__profile--static">
              <ProfileAvatar name={displayName} className="secura-neo-nav__avatar" />
              <span className="secura-neo-nav__profile-copy">
                <b>{displayName}</b><small>Administrator</small>
              </span>
            </div>
            <button
              type="button"
              className="secura-neo-nav__logout"
              onClick={signOut}
              aria-label="Log out"
              title="Log out"
            ><LogOut size={18} /></button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default AdminNeoSidebar

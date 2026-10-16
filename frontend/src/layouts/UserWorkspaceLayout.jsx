import { useState } from 'react'
import { flushSync } from 'react-dom'
import {
  ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3,
  FileCheck2, FileClock, House, Library, LogOut, Menu,
  Moon, ShieldCheck, Sparkles, Sun, X,
} from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import ProfileAvatar from '../components/ProfileAvatar'
import UserAiJobChip from '../components/UserAiJobChip'
import { useAuth } from '../context/useAuth'
import '../pages/user/UserDashboardNeo.css'

// V15.5: approved User sidebar used on Anonymize and Library.
// Remaining User routes retain their current layout until separately redesigned.
const userNavigation = [
  { label: 'Overview', path: '/user/dashboard', icon: House },
  { label: 'Anonymize document', path: '/user/anonymize', icon: Sparkles },
  { label: 'Anonymized file library', path: '/user/library', icon: Library },
  { label: 'Original access', path: '/user/original-access', icon: FileClock },
  { label: 'Approval file library', path: '/user/approved-originals', icon: FileCheck2 },
]

const legacyNavigation = [
  { label: 'Back to home', path: '/user/dashboard', icon: ArrowLeft },
  { label: 'Anonymize document', path: '/user/anonymize', icon: Sparkles },
  { label: 'Anonymized file library', path: '/user/library', icon: Library },
  { label: 'Original access', path: '/user/original-access', icon: Clock3,
    activePaths: ['/user/original-access', '/user/my-requests', '/user/owner-approvals'] },
  { label: 'Approval file library', path: '/user/approved-originals', icon: FileCheck2 },
]

function getInitialTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}
function getCollapsed() {
  try { return window.localStorage.getItem('secura-user-nav-mini') === 'yes' }
  catch { return false }
}

function UserWorkspaceLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [theme, setTheme] = useState(getInitialTheme)
  const [collapsed, setCollapsed] = useState(getCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const displayName = user?.full_name?.trim() || user?.username || 'User'

  // Do not visually change User Library / Original Access before their own redesigns.
  if (!['/user/anonymize', '/user/library'].includes(location.pathname)) {
    return (
      <div className="secura-workspace-shell">
        <aside className="secura-sidebar">
          <div className="secura-sidebar-brand">
            <span className="secura-sidebar-brand-mark">S</span>
            <span className="secura-sidebar-brand-name">Secura</span>
          </div>
          <p className="secura-sidebar-brand-note">DOCUMENT PRIVACY PLATFORM</p>
          <p className="secura-sidebar-label">WORKSPACE</p>
          <nav className="secura-side-nav">
            {legacyNavigation.map(({ label, path, icon: Icon, activePaths }) => (
              <Link key={path} to={path}
                className={`secura-side-link ${(activePaths || [path]).includes(location.pathname) ? 'active' : ''}`}>
                <Icon size={17} /><span>{label}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <main className="secura-workspace-main"><Outlet /></main>
      </div>
    )
  }

  const open = (path) => { setMobileOpen(false); navigate(path) }
  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    try { window.localStorage.setItem('secura-user-nav-mini', next ? 'yes' : 'no') }
    catch { /* optional */ }
  }
  const changeTheme = (event) => {
    const root = document.documentElement
    const next = root.dataset.theme === 'light' ? 'dark' : 'light'
    const apply = () => {
      root.dataset.theme = next
      try { window.localStorage.setItem('secura-theme', next) } catch { /* optional */ }
      flushSync(() => setTheme(next))
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduced) { apply(); return }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.ceil(Math.max(
      Math.hypot(x, y), Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y),
    ))
    root.style.setProperty('--theme-transition-x', `${x}px`)
    root.style.setProperty('--theme-transition-y', `${y}px`)
    root.style.setProperty('--theme-transition-radius', `${radius}px`)
    root.classList.add('secura-theme-transitioning', 'secura-neo-theme-wave')
    try {
      const transition = document.startViewTransition(() => apply())
      void transition.finished.catch(() => {}).finally(() => {
        root.classList.remove('secura-theme-transitioning', 'secura-neo-theme-wave')
      })
    } catch {
      root.classList.remove('secura-theme-transitioning', 'secura-neo-theme-wave')
      apply()
    }
  }
  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="secura-user-neo uad15__shell-root">
      <div className="sun15__shell">
        {mobileOpen && <button type="button" className="sun15__backdrop" aria-label="Close navigation"
          onClick={() => setMobileOpen(false)} />}
        <aside className={`sun15__sidebar ${collapsed ? 'is-mini' : ''} ${mobileOpen ? 'is-open' : ''}`}
          aria-label="User workspace navigation">
          <div className="sun15__side-glow" aria-hidden="true" />
          <div className="sun15__side-top">
            <button className="sun15__brand" type="button" aria-label="SECURA User home"
              onClick={() => open('/user/dashboard')}>
              <span className="sun15__brand-logo" aria-hidden="true">
                <img className="sun15__logo-full" src="/secura-logo-dark.png" alt="" onError={(event) => {
                  event.currentTarget.hidden = true
                  event.currentTarget.parentElement?.classList.add('is-full-missing')
                }} />
                <img className="sun15__logo-mark" src="/secura-logo-dark-mark.png" alt="" onError={(event) => {
                  event.currentTarget.hidden = true
                  event.currentTarget.parentElement?.classList.add('is-mark-missing')
                }} />
                <span className="sun15__brand-fallback">SECURA</span>
              </span>
            </button>
            <div className="sun15__collapse-wrap"><button type="button" className="sun15__collapse"
              onClick={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button></div>
            <button className="sun15__side-close" type="button" onClick={() => setMobileOpen(false)}
              aria-label="Close menu"><X size={19} /></button>
          </div>
          <p className="sun15__nav-label">WORKSPACE</p>
          <nav className="sun15__nav" aria-label="User pages">
            {userNavigation.map(({ label, path, icon: Icon }) => (
              <button key={path} type="button" title={collapsed ? label : undefined}
                className={`sun15__nav-item ${location.pathname === path ? 'is-active' : ''}`}
                onClick={() => open(path)}>
                <Icon size={18} strokeWidth={1.9} /><span>{label}</span>
                <ChevronRight className="sun15__nav-arrow" size={15} aria-hidden="true" />
              </button>
            ))}
          </nav>
          <UserAiJobChip />
          <div className="sun15__sidebar-bottom"><div className="sun15__bottom-dock">
            <button type="button" className="sun15__glass-toggle" onClick={changeTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              <span className="sun15__glass-title">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              <span className={`sun15__glass-track ${theme === 'dark' ? 'is-dark' : 'is-light'}`} aria-hidden="true">
                <Sun className="sun15__glass-sun" size={13} /><Moon className="sun15__glass-moon" size={13} />
                <span className="sun15__glass-thumb">{theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}</span>
              </span>
            </button>
            <button type="button" className="sun15__bottom-logout" onClick={handleLogout}
              aria-label="Log out" title="Log out"><LogOut size={18} /><span>Log out</span></button>
          </div></div>
        </aside>
        <div className="sun15__workspace uad15__workspace">
          {/* Shared User header: one DOM structure for Anonymize and Library. */}
          <header className="suw1555__header" aria-label="User workspace header">
            <div className="suw1555__header-left">
              <button
                type="button"
                className="suw1555__menu"
                aria-label="Open user navigation"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="suw1555__brand" aria-label="SECURA / Document Privacy">
                <span className="suw1555__brand-icon" aria-hidden="true">
                  <ShieldCheck size={19} strokeWidth={2} />
                </span>
                <span className="suw1555__brand-name">SECURA <span className="suw1555__slash">/</span> DOCUMENT PRIVACY</span>
              </div>
            </div>
            <div className="suw1555__header-right">
              <span className="suw1555__date">
                <CalendarDays size={15} aria-hidden="true" />
                {new Intl.DateTimeFormat('en-MY', {
                  weekday: 'short', day: 'numeric', month: 'short',
                }).format(new Date())}
              </span>
              <button
                type="button"
                className="suw1555__profile"
                onClick={() => open('/user/profile')}
                aria-label={`Open ${displayName}'s profile`}
              >
                <ProfileAvatar
                  name={displayName}
                  className="suw1555__avatar"
                  alt={`${displayName} profile photo`}
                />
                <span className="suw1555__profile-label">
                  <strong>{displayName}</strong>
                  <small>My profile</small>
                </span>
                <ChevronRight size={16} className="suw1555__profile-arrow" aria-hidden="true" />
              </button>
            </div>
          </header>
          <main className="uad15__workspace-main"><Outlet /></main>
        </div>
      </div>
    </div>
  )
}

export default UserWorkspaceLayout

import { StrictMode, useLayoutEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'

import App from './App.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import './index.css'

// SECURA NeoFlow V14.3 - Smooth transitions on React Router page changes.
// Kept inside main.jsx to avoid a second watched JSX file on Windows.
// No route remounts; sessions, forms, modals, APIs, themes and Lenis are unchanged.

const PAGE_SELECTORS = {
  login: [
    '.secura-neo-login__entry-center',
    '.secura-neo-login__story-content',
  ],
  adminDashboard: [
    '.secura-neo-dash__inner',
    '.secura-neo-dash',
  ],
  adminWorkspace: [
    '.secura-neo-admin-content',
    '.secura-neo-management-main',
    '.secura-workspace-main',
  ],
  securityDashboard: [
    '.secura-soc-container',
    '.secura-soc-main',
  ],
  securityWorkspace: [
    '.secura-soc-workspace-main',
    '.secura-soc-review-main',
    '.secura-workspace-main',
  ],
  profile: [
    '.secura-profile-page-main',
    '.socp14',
    '.security-profile-pro',
  ],
  userDashboard: [
    '.role-dashboard__content',
    '.role-dashboard',
  ],
  userWorkspace: [
    '.secura-workspace-main',
    '.secura-neo-management-main',
  ],
  fallback: [
    '.secura-neo-login__entry-center',
    '#root main',
    '#root > div',
  ],
}

function targetsForPage(pathname) {
  if (pathname === '/login') {
    // The page's theme toggle and background are not animated.
    const found = PAGE_SELECTORS.login
      .map((selector) => document.querySelector(selector))
      .filter(Boolean)
    if (found.length) return found
  }

  let key = 'fallback'
  if (pathname === '/admin/dashboard') key = 'adminDashboard'
  else if (pathname === '/admin/profile' || pathname === '/security/profile' || pathname === '/user/profile') key = 'profile'
  else if (pathname.startsWith('/admin/')) key = 'adminWorkspace'
  else if (pathname === '/security/dashboard') key = 'securityDashboard'
  else if (pathname.startsWith('/security/')) key = 'securityWorkspace'
  else if (pathname === '/user/dashboard') key = 'userDashboard'
  else if (pathname.startsWith('/user/')) key = 'userWorkspace'

  const selectors = [
    ...PAGE_SELECTORS[key],
    ...PAGE_SELECTORS.fallback,
  ]

  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) return [element]
  }
  return []
}

// eslint-disable-next-line react-refresh/only-export-components -- Bootstrap-only component intentionally remains in main.jsx to avoid Windows EBUSY file-watch failures.
function SecuraRouteTransitions() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const animations = useRef([])

  useLayoutEffect(() => {
    const previous = previousPath.current
    previousPath.current = pathname

    // Cancel any older animation before handling the next route.
    for (const animation of animations.current) animation.cancel()
    animations.current = []

    // Do not animate first load, or when only query/hash/state changes.
    if (previous === pathname) return undefined

    // Respect OS accessibility setting. Don't animate background tabs.
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.visibilityState === 'hidden'
    ) return undefined

    let cancelled = false
    let frameId = 0
    let attempts = 0

    const animateMountedPage = () => {
      if (cancelled) return
      const elements = targetsForPage(pathname)

      // Await late-mounted route content, if needed. No permanent observer.
      if (elements.length === 0 && attempts < 3) {
        attempts += 1
        frameId = window.requestAnimationFrame(animateMountedPage)
        return
      }

      elements.forEach((element, index) => {
        if (typeof element.animate !== 'function') return
        const animation = element.animate(
          [
            { opacity: 0.08, transform: 'translate3d(0, 16px, 0) scale(0.993)' },
            { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
          ],
          {
            duration: 320 + index * 45,
            delay: index * 45,
            easing: 'cubic-bezier(0.19, 1, 0.22, 1)',
            fill: 'both',
          },
        )
        animations.current.push(animation)
        // Remove our temporary style overrides when the entrance completes.
        void animation.finished.then(() => animation.cancel()).catch(() => {})
      })
    }

    // useLayoutEffect runs after React Router commits the new DOM,
    // before the browser paints, so the transition starts immediately.
    animateMountedPage()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
      for (const animation of animations.current) animation.cancel()
      animations.current = []
    }
  }, [pathname])

  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <SecuraRouteTransitions />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

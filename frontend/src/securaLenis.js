/**
 * SECURA NeoFlow V11.6.1 — Lenis balanced inertia scrolling
 * Shared by Admin, User, Security Officer, login, and standalone profile routes.
 *
 * Smoothness 70/100 is a SECURA design target, not an official Lenis setting.
 * lerp: 0.10 produces a noticeable but controlled desktop scroll tail.
 * Wheel scrolling upward uses 72% of its previous distance; downward is unchanged.
 * Nothing in this module changes authentication, React routes, or theme state.
 */
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

// Controls with their own scroll behavior MUST remain native.
// This includes dialogs/backdrops, library tables, and sidebar panels.
const NATIVE_SCROLL_AREAS = [
  '[data-lenis-prevent]',
  '[role="dialog"]',
  '[aria-modal="true"]',
  '[role="listbox"]',
  '[role="menu"]',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '.admin-modal-backdrop',
  '.admin-user-modal',
  '.admin-small-modal',
  '.admin-department-modal',
  '.anonymize-modal-backdrop',
  '.anonymize-replacements-modal',
  '.library-modal-backdrop',
  '.library-access-modal',
  '.library-archive-modal',
  '.access-modal-backdrop',
  '.security-log-modal-backdrop',
  '.security-log-modal',
  '.security-alert-details-modal',
  '.security-review-modal',
  '.security-review-figma-modal',
  '.approved-details-modal',
  '.secura-neo-nav',
  '.secura-neo-nav__overlay',
  '.admin-users-table-wrap',
  '.admin-departments-table-wrap',
  '.library-table-wrap',
  '.approved-library-table-wrap',
  '.security-logs-table-wrap',
  '.security-alerts-table-wrap',
  '.security-review-figma-table-wrap',
].join(', ')

function keepNativeScroll(node) {
  return node instanceof Element && node.closest(NATIVE_SCROLL_AREAS) !== null
}

// Lenis attaches to the window once, outside React StrictMode.
// On wheel input it smooths the document scroll. Touch remains native.
const lenis = new Lenis({
  autoRaf: true,
  autoResize: true,
  autoToggle: true,
  smoothWheel: true,
  syncTouch: false,
  lerp: 0.10,
  wheelMultiplier: 0.95,
  // The mouse wheel uses the same easing in both directions, but
  // upward wheel steps cover less distance so they do not feel too fast.
  // Downward scrolling is unchanged from V11.6 (70/100 target).
  // Lenis supports changing deltaY through virtualScroll before consumption.
  virtualScroll: (data) => {
    if (data.event.type === 'wheel' && data.deltaY < 0) {
      data.deltaY *= 0.72
    }
    return true
  },
  allowNestedScroll: true,
  anchors: true,
  stopInertiaOnNavigate: true,
  respectReducedMotion: true,
  prevent: keepNativeScroll,
})

// Prevent a duplicate animation loop when Vite hot-reloads this module.
if (import.meta.hot) {
  import.meta.hot.dispose(() => lenis.destroy())
}

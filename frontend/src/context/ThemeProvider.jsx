import {
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'

import ThemeContext from './ThemeContext'

const THEME_STORAGE_KEY = 'secura_theme'

function getInitialTheme() {
  const savedTheme =
    window.localStorage.getItem(
      THEME_STORAGE_KEY,
    )

  if (
    savedTheme === 'light' ||
    savedTheme === 'dark'
  ) {
    return savedTheme
  }

  return window.matchMedia?.(
    '(prefers-color-scheme: dark)',
  ).matches
    ? 'dark'
    : 'light'
}

function applyThemeToDocument(theme) {
  document.documentElement.dataset.theme =
    theme

  document.documentElement.style.colorScheme =
    theme

  window.localStorage.setItem(
    THEME_STORAGE_KEY,
    theme,
  )
}

function getTransitionOrigin(origin) {
  if (
    origin &&
    Number.isFinite(origin.x) &&
    Number.isFinite(origin.y)
  ) {
    return origin
  }

  return {
    x: window.innerWidth - 40,
    y: window.innerHeight - 40,
  }
}

function ThemeProvider({ children }) {
  const [theme, setThemeState] =
    useState(getInitialTheme)

  const transitionRunningRef =
    useRef(false)

  useLayoutEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  const changeTheme = (
    nextTheme,
    origin,
  ) => {
    if (
      nextTheme !== 'light' &&
      nextTheme !== 'dark'
    ) {
      return
    }

    if (
      nextTheme === theme ||
      transitionRunningRef.current
    ) {
      return
    }

    const reduceMotion =
      window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches

    const supportsViewTransition =
      typeof document.startViewTransition ===
      'function'

    if (
      reduceMotion ||
      !supportsViewTransition
    ) {
      applyThemeToDocument(nextTheme)
      setThemeState(nextTheme)
      return
    }

    const point =
      getTransitionOrigin(origin)

    const radius = Math.hypot(
      Math.max(
        point.x,
        window.innerWidth - point.x,
      ),
      Math.max(
        point.y,
        window.innerHeight - point.y,
      ),
    )

    const root =
      document.documentElement

    transitionRunningRef.current = true

    root.style.setProperty(
      '--theme-transition-x',
      `${point.x}px`,
    )

    root.style.setProperty(
      '--theme-transition-y',
      `${point.y}px`,
    )

    root.style.setProperty(
      '--theme-transition-radius',
      `${radius}px`,
    )

    root.classList.add(
      'secura-theme-transitioning',
    )

    try {
      const transition =
        document.startViewTransition(
          () => {
            applyThemeToDocument(
              nextTheme,
            )

            flushSync(() => {
              setThemeState(
                nextTheme,
              )
            })
          },
        )

      transition.finished
        .catch(() => {})
        .finally(() => {
          transitionRunningRef.current =
            false

          root.classList.remove(
            'secura-theme-transitioning',
          )

          root.style.removeProperty(
            '--theme-transition-x',
          )

          root.style.removeProperty(
            '--theme-transition-y',
          )

          root.style.removeProperty(
            '--theme-transition-radius',
          )
        })
    } catch {
      transitionRunningRef.current =
        false

      root.classList.remove(
        'secura-theme-transitioning',
      )

      root.style.removeProperty(
        '--theme-transition-x',
      )

      root.style.removeProperty(
        '--theme-transition-y',
      )

      root.style.removeProperty(
        '--theme-transition-radius',
      )

      applyThemeToDocument(nextTheme)
      setThemeState(nextTheme)
    }
  }

  const value = {
    theme,
    isDark: theme === 'dark',

    setTheme: (
      nextTheme,
      origin,
    ) => {
      changeTheme(
        nextTheme,
        origin,
      )
    },

    toggleTheme: (origin) => {
      changeTheme(
        theme === 'dark'
          ? 'light'
          : 'dark',
        origin,
      )
    },
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider

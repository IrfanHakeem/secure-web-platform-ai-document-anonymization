import {
  Moon,
  Sun,
} from 'lucide-react'

import useTheme from '../context/useTheme'

function ThemeToggle() {
  const {
    isDark,
    toggleTheme,
  } = useTheme()

  const handleThemeToggle = (
    event,
  ) => {
    const rect =
      event.currentTarget.getBoundingClientRect()

    toggleTheme({
      x:
        rect.left +
        rect.width / 2,
      y:
        rect.top +
        rect.height / 2,
    })
  }

  return (
    <button
      type="button"
      className={[
        'secura-bold-theme-switch',
        isDark ? 'is-dark' : 'is-light',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleThemeToggle}
      aria-label={
        isDark
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
      title={
        isDark
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
    >
      <span className="secura-bold-theme-switch__mode">
        {isDark ? (
          <Moon size={14} />
        ) : (
          <Sun size={14} />
        )}

        <b>
          {isDark
            ? 'Dark'
            : 'Light'}
        </b>
      </span>

      <span
        className="secura-bold-theme-switch__rail"
        aria-hidden="true"
      >
        <span className="secura-bold-theme-switch__thumb" />
      </span>
    </button>
  )
}

export default ThemeToggle

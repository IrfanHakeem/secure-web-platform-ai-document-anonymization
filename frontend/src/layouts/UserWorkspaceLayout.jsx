import {
  ArrowLeft,
  Clock3,
  FileCheck2,
  Library,
  Sparkles,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  {
    label: 'Back to home',
    path: '/user/dashboard',
    icon: ArrowLeft,
  },
  {
    label: 'Anonymize document',
    path: '/user/anonymize',
    icon: Sparkles,
  },
  {
    label: 'Anonymized file library',
    path: '/user/library',
    icon: Library,
  },
  {
    label: 'Original access',
    path: '/user/original-access',
    icon: Clock3,
  },
  {
    label: 'Approval file library',
    path: '/user/approved-originals',
    icon: FileCheck2,
  },
]

function UserWorkspaceLayout() {
  return (
    <div className="secura-workspace-shell">
      <aside className="secura-sidebar">
        <div className="secura-sidebar-brand">
          <span className="secura-sidebar-brand-mark">
            S
          </span>

          <span className="secura-sidebar-brand-name">
            Secura
          </span>
        </div>

        <p className="secura-sidebar-brand-note">
          DOCUMENT PRIVACY PLATFORM
        </p>

        <p className="secura-sidebar-label">
          WORKSPACE
        </p>

        <nav className="secura-side-nav">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) =>
                  [
                    'secura-side-link',
                    isActive ? 'active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              >
                <Icon size={17} />

                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <main className="secura-workspace-main">
        <Outlet />
      </main>
    </div>
  )
}

export default UserWorkspaceLayout
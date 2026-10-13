import {
  ArrowLeft,
  Clock3,
  FileCheck2,
  Library,
  Sparkles,
} from 'lucide-react'
import {
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom'

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
    activePaths: [
      '/user/original-access',
      '/user/my-requests',
      '/user/owner-approvals',
    ],
  },
  {
    label: 'Approval file library',
    path: '/user/approved-originals',
    icon: FileCheck2,
  },
]

function UserWorkspaceLayout() {
  const location = useLocation()

  return (
    <div className="secura-workspace-shell secura-workspace-shell--bold">
      <aside className="secura-sidebar secura-sidebar--bold">
        <div className="secura-sidebar-bold__mesh" />
        <div className="secura-sidebar-bold__orb secura-sidebar-bold__orb--one" />
        <div className="secura-sidebar-bold__orb secura-sidebar-bold__orb--two" />

        <div className="secura-sidebar-brand secura-sidebar-brand--bold">
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

        <nav className="secura-side-nav secura-side-nav--bold">
          {navigation.map((item) => {
            const Icon = item.icon

            const paths =
              item.activePaths ?? [item.path]

            const isActive =
              paths.includes(location.pathname)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={[
                  'secura-side-link',
                  'secura-side-link--bold',
                  isActive ? 'active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="secura-side-link__icon">
                  <Icon size={17} />
                </span>

                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

      </aside>

      <main className="secura-workspace-main secura-workspace-main--bold">
        <Outlet />
      </main>
    </div>
  )
}

export default UserWorkspaceLayout

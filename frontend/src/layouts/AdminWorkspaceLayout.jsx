import {
  ArrowLeft,
  Building2,
  UserCog,
} from 'lucide-react'
import {
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom'

const navigation = [
  {
    label: 'Back to dashboard',
    path: '/admin/dashboard',
    icon: ArrowLeft,
  },
  {
    label: 'User management',
    path: '/admin/users',
    icon: UserCog,
  },
  {
    label: 'Department management',
    path: '/admin/departments',
    icon: Building2,
  },
]

function AdminWorkspaceLayout() {
  const location = useLocation()

  const isProfilePage =
    location.pathname === '/admin/profile'

  if (isProfilePage) {
    return (
      <div className="secura-profile-page-shell">
        <main className="secura-profile-page-main">
          <div className="secura-profile-page-back-row">
            <Link
              to="/admin/dashboard"
              className="secura-profile-back-link"
            >
              <ArrowLeft size={15} />
              <span>Back to dashboard</span>
            </Link>
          </div>

          <Outlet />
        </main>
      </div>
    )
  }

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
          ADMINISTRATION PORTAL
        </p>

        <p className="secura-sidebar-label">
          ADMIN WORKSPACE
        </p>

        <nav className="secura-side-nav">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={[
                  'secura-side-link',
                  isActive ? 'active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
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

export default AdminWorkspaceLayout

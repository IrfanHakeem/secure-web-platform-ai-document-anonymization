import {
  ArrowLeft,
  Building2,
  UserCog,
  UserRound,
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
  {
    label: 'Profile',
    path: '/admin/profile',
    icon: UserRound,
  },
]

function AdminWorkspaceLayout() {
  const location = useLocation()

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
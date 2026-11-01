import { ArrowLeft } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import AdminNeoSidebar from '../components/AdminNeoSidebar'
import './AdminWorkspaceNeoSync.css'

function AdminWorkspaceLayout() {
  const location = useLocation()
  const isProfilePage = location.pathname === '/admin/profile'
  const isDashboardPage = location.pathname === '/admin/dashboard'

  // The profile intentionally remains a standalone page (no sidebar).
  // This keeps the existing profile / password-security workflow intact.
  if (isProfilePage) {
    return (
      <div className="secura-profile-page-shell secura-neo-admin-profile-shell secura-neo-admin-sync">
        <main className="secura-profile-page-main secura-neo-admin-profile-main">
          <div className="secura-profile-page-back-row">
            <Link to="/admin/dashboard" className="secura-profile-back-link">
              <ArrowLeft size={16} />
              <span>Back to dashboard</span>
            </Link>
          </div>
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="secura-workspace-shell secura-neo-layout secura-neo-layout--management secura-neo-admin-sync">
      <AdminNeoSidebar />
      <main className={`secura-workspace-main secura-neo-management-main secura-neo-admin-management-main${isDashboardPage ? ' secura-neo-management-main--dashboard' : ''}`}>
        <div className={isDashboardPage ? 'secura-neo-admin-dashboard-slot' : 'secura-neo-admin-content'}>
          <Outlet context={{ securaAdminShell: true }} />
        </div>
      </main>
    </div>
  )
}

export default AdminWorkspaceLayout

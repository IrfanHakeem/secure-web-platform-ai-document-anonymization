import { ArrowLeft } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import SecurityNeoSidebar from '../components/SecurityNeoSidebar'
import '../pages/security/SecurityNeo.css'
import '../pages/security/SecurityReviewNeo.css'

export default function SecurityWorkspaceLayout() {
  const location = useLocation()
  const isReviewPage = location.pathname === '/security/reviews'

  // The standalone Profile layout is intentionally unchanged.
  if (location.pathname === '/security/profile') {
    return (
      <div className="secura-profile-page-shell">
        <main className="secura-profile-page-main">
          <div className="secura-profile-page-back-row">
            <Link to="/security/dashboard" className="secura-profile-back-link">
              <ArrowLeft size={15} />
              <span>Back to dashboard</span>
            </Link>
          </div>
          <Outlet />
        </main>
      </div>
    )
  }

  // V13.3 affects the Review page only. Alerts and Audit Logs retain their styles.
  return (
    <div className="secura-sec-shell secura-soc-app secura-soc-workspace">
      <SecurityNeoSidebar />
      <main
        className={`secura-workspace-main secura-soc-workspace-main${isReviewPage ? ' secura-soc-review-main' : ''}`}
      >
        <Outlet />
      </main>
    </div>
  )
}

import { Navigate as SecuraNavigate } from 'react-router-dom'
import { useAuth as useSecuraAuth } from './context/useAuth'
import { ROLES as SECURA_ROLES } from './utils/roles'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import AdminWorkspaceLayout from './layouts/AdminWorkspaceLayout'
import SecurityWorkspaceLayout from './layouts/SecurityWorkspaceLayout'
import UserWorkspaceLayout from './layouts/UserWorkspaceLayout'

import LoginPage from './pages/auth/LoginPage'
import AdminPasswordRecovery from './pages/auth/AdminPasswordRecovery'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminDepartmentManagement from './pages/admin/AdminDepartmentManagement'
import AdminProfile from './pages/admin/AdminProfile'
import AdminUserManagement from './pages/admin/AdminUserManagement'

import OriginalAccessReview from './pages/security/OriginalAccessReview'
import SecurityAlerts from './pages/security/SecurityAlerts'
import SecurityDashboard from './pages/security/SecurityDashboard'
import SecurityLogs from './pages/security/SecurityLogs'
import SecurityProfile from './pages/security/SecurityProfile'

import AnonymizedLibrary from './pages/user/AnonymizedLibrary'
import AnonymizeDocument from './pages/user/AnonymizeDocument'
import ApprovedOriginalLibrary from './pages/user/ApprovedOriginalLibrary'
import OriginalAccess from './pages/user/OriginalAccess'
import UserDashboard from './pages/user/UserDashboard'
import UserProfile from './pages/user/UserProfile'

import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import { ROLES } from './utils/roles'

import { useAuth } from './context/useAuth'

function SecuraRoleRedirect() {
  const { user, loading } = useAuth()

  // A session may still be verifying after a browser refresh.
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const homeByRole = {
    [ROLES.USER]: '/user/dashboard',
    [ROLES.ADMINISTRATOR]: '/admin/dashboard',
    [ROLES.SECURITY_OFFICER]: '/security/dashboard',
  }

  // Unauthorized routes send a signed-in user back to their OWN dashboard.
  // RoleRoute and ProtectedRoute continue enforcing access controls.
  return <Navigate to={homeByRole[user.role] || '/login'} replace />
}


function SecuraHomeRedirect() {
  const { user } = useSecuraAuth()

  if (!user) {
    return <SecuraNavigate to="/login" replace />
  }

  const destination =
    user.role === SECURA_ROLES.ADMINISTRATOR
      ? '/admin/dashboard'
      : user.role === SECURA_ROLES.SECURITY_OFFICER
        ? '/security/dashboard'
        : user.role === SECURA_ROLES.USER
          ? '/user/dashboard'
          : '/unauthorized'

  return <SecuraNavigate to={destination} replace />
}
function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/forgot-password"
        element={
          <AdminPasswordRecovery />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <SecuraHomeRedirect />
          }
        />

        {/* =========================
            USER
        ========================= */}

        <Route
          element={
            <RoleRoute
              allowedRoles={[
                ROLES.USER,
              ]}
            />
          }
        >
          <Route
            path="/user/dashboard"
            element={<UserDashboard />}
          />

          <Route
            element={
              <UserWorkspaceLayout />
            }
          >
            <Route
              path="/user/anonymize"
              element={
                <AnonymizeDocument />
              }
            />

            <Route
              path="/user/library"
              element={
                <AnonymizedLibrary />
              }
            />

            <Route
              path="/user/original-access"
              element={
                <OriginalAccess />
              }
            />

            <Route
              path="/user/my-requests"
              element={
                <OriginalAccess />
              }
            />

            <Route
              path="/user/owner-approvals"
              element={
                <OriginalAccess />
              }
            />

            <Route
              path="/user/approved-originals"
              element={
                <ApprovedOriginalLibrary />
              }
            />
          </Route>

          <Route
            path="/user/profile"
            element={<UserProfile />}
          />
        </Route>

        {/* =========================
            ADMINISTRATOR
        ========================= */}

        <Route
          element={
            <RoleRoute
              allowedRoles={[
                ROLES.ADMINISTRATOR,
              ]}
            />
          }
        >
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            element={
              <AdminWorkspaceLayout />
            }
          >
            <Route
              path="/admin/users"
              element={
                <AdminUserManagement />
              }
            />

            <Route
              path="/admin/departments"
              element={
                <AdminDepartmentManagement />
              }
            />

            <Route
              path="/admin/profile"
              element={
                <AdminProfile />
              }
            />
          </Route>
        </Route>

        {/* =========================
            SECURITY OFFICER
        ========================= */}

        <Route
          element={
            <RoleRoute
              allowedRoles={[
                ROLES.SECURITY_OFFICER,
              ]}
            />
          }
        >
          <Route
            path="/security/dashboard"
            element={
              <SecurityDashboard />
            }
          />

          <Route
            element={
              <SecurityWorkspaceLayout />
            }
          >
            <Route
              path="/security/reviews"
              element={
                <OriginalAccessReview />
              }
            />

            <Route
              path="/security/alerts"
              element={
                <SecurityAlerts />
              }
            />

            <Route
              path="/security/logs"
              element={
                <SecurityLogs />
              }
            />

            <Route
              path="/security/profile"
              element={
                <SecurityProfile />
              }
            />
          </Route>
        </Route>
      </Route>

      <Route
        path="/unauthorized"
        element={
          <SecuraRoleRedirect />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  )
}

export default App

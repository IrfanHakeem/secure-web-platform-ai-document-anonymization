import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import AdminWorkspaceLayout from './layouts/AdminWorkspaceLayout'
import SecurityWorkspaceLayout from './layouts/SecurityWorkspaceLayout'
import UserWorkspaceLayout from './layouts/UserWorkspaceLayout'

import LoginPage from './pages/auth/LoginPage'

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

function Placeholder({ title }) {
  return (
    <main className="min-h-screen bg-[#f7f8fb] p-10">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#e9eaf0] bg-white p-10 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6560c9]">
          Secura
        </p>

        <h1 className="mt-3 text-3xl font-semibold text-[#22283b]">
          {title}
        </h1>
      </div>
    </main>
  )
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
          <Placeholder title="Administrator Password Recovery" />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <Placeholder title="Authenticated Workspace" />
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
          <Placeholder title="Unauthorized Access" />
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
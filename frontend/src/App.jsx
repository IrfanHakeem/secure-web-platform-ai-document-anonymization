import { Navigate, Route, Routes } from 'react-router-dom'

import UserWorkspaceLayout from './layouts/UserWorkspaceLayout'
import LoginPage from './pages/auth/LoginPage'
import AnonymizeDocument from './pages/user/AnonymizeDocument'
import UserDashboard from './pages/user/UserDashboard'
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

function WorkspacePlaceholder({ title }) {
  return (
    <section>
      <p className="secura-eyebrow">
        SECURE WORKSPACE
      </p>

      <h1 className="mt-2 text-3xl font-semibold text-[#22283b]">
        {title}
      </h1>

      <div className="mt-8 rounded-[18px] border border-[#e9eaf0] bg-white p-8 shadow-sm">
        <p className="text-sm text-[#7d8494]">
          This workspace will be connected in the next step.
        </p>
      </div>
    </section>
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

        <Route
          element={
            <RoleRoute allowedRoles={[ROLES.USER]} />
          }
        >
          <Route
            path="/user/dashboard"
            element={<UserDashboard />}
          />

          <Route element={<UserWorkspaceLayout />}>
            <Route
              path="/user/anonymize"
              element={<AnonymizeDocument />}
            />

            <Route
              path="/user/library"
              element={
                <WorkspacePlaceholder title="Anonymized File Library" />
              }
            />

            <Route
              path="/user/original-access"
              element={
                <WorkspacePlaceholder title="Original Access" />
              }
            />

            <Route
              path="/user/my-requests"
              element={
                <WorkspacePlaceholder title="My Requests" />
              }
            />

            <Route
              path="/user/owner-approvals"
              element={
                <WorkspacePlaceholder title="Owner Approval" />
              }
            />

            <Route
              path="/user/approved-originals"
              element={
                <WorkspacePlaceholder title="Approval File Library" />
              }
            />
          </Route>

          <Route
            path="/user/profile"
            element={
              <Placeholder title="Profile" />
            }
          />
        </Route>

        <Route
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMINISTRATOR]}
            />
          }
        >
          <Route
            path="/admin/dashboard"
            element={
              <Placeholder title="Administrator Dashboard" />
            }
          />
        </Route>

        <Route
          element={
            <RoleRoute
              allowedRoles={[ROLES.SECURITY_OFFICER]}
            />
          }
        >
          <Route
            path="/security/dashboard"
            element={
              <Placeholder title="Security Officer Dashboard" />
            }
          />
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
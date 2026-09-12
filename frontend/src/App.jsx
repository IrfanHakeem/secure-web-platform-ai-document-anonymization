import { Navigate, Route, Routes } from 'react-router-dom'

import LoginPage from './pages/auth/LoginPage'
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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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

        <Route element={<RoleRoute allowedRoles={[ROLES.USER]} />}>
          <Route
            path="/user/dashboard"
            element={<UserDashboard />}
          />

          <Route
            path="/user/anonymize"
            element={<Placeholder title="Anonymize Document" />}
          />

          <Route
            path="/user/library"
            element={<Placeholder title="Anonymized File Library" />}
          />

          <Route
            path="/user/original-access"
            element={<Placeholder title="Original Access" />}
          />

          <Route
            path="/user/my-requests"
            element={<Placeholder title="My Requests" />}
          />

          <Route
            path="/user/owner-approvals"
            element={<Placeholder title="Owner Approval" />}
          />

          <Route
            path="/user/approved-originals"
            element={<Placeholder title="Approval File Library" />}
          />

          <Route
            path="/user/profile"
            element={<Placeholder title="Profile" />}
          />
        </Route>

        <Route
          element={
            <RoleRoute allowedRoles={[ROLES.ADMINISTRATOR]} />
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
            <RoleRoute allowedRoles={[ROLES.SECURITY_OFFICER]} />
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
        element={<Placeholder title="Unauthorized Access" />}
      />

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default App
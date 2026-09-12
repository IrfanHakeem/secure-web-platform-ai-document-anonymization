import { Navigate, Route, Routes } from 'react-router-dom'

import LoginPage from './pages/auth/LoginPage'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import { ROLES } from './utils/roles'

function Placeholder({ title }) {
  return (
    <main className="min-h-screen bg-slate-50 p-10">
      <div className="mx-auto max-w-5xl rounded-3xl border border-violet-100 bg-white p-10 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
          Secura
        </p>

        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
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

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={<Placeholder title="Authenticated Workspace" />}
        />

        <Route element={<RoleRoute allowedRoles={[ROLES.USER]} />}>
          <Route
            path="/user/dashboard"
            element={<Placeholder title="User Dashboard" />}
          />
        </Route>

        <Route element={<RoleRoute allowedRoles={[ROLES.ADMINISTRATOR]} />}>
          <Route
            path="/admin/dashboard"
            element={<Placeholder title="Administrator Dashboard" />}
          />
        </Route>

        <Route
          element={<RoleRoute allowedRoles={[ROLES.SECURITY_OFFICER]} />}
        >
          <Route
            path="/security/dashboard"
            element={<Placeholder title="Security Officer Dashboard" />}
          />
        </Route>
      </Route>

      <Route
        path="/unauthorized"
        element={<Placeholder title="Unauthorized Access" />}
      />

      <Route
        path="/forgot-password"
        element={<Placeholder title="Administrator Password Recovery" />}
      />
      
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
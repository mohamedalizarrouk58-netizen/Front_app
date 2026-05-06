import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import EntityCrudPage from './pages/admin/EntityCrudPage'
import RoleLayout from './pages/roles/RoleLayout'
import RoleModulePage from './pages/roles/RoleModulePage'
import RoleOverviewPage from './pages/roles/RoleOverviewPage'
import MessagesPage from './pages/shared/MessagesPage'
import {
  ROLE_ROUTES,
  clearAuth,
  getRouteForRole,
  getStoredAuth,
  isAuthValid,
} from './lib/auth'

function ProtectedRoute({ children, allowedRole }) {
  const auth = getStoredAuth()

  if (!isAuthValid(auth)) {
    clearAuth()
    return <Navigate to="/login" replace />
  }

  if (allowedRole && auth.role !== allowedRole) {
    return <Navigate to={getRouteForRole(auth.role)} replace />
  }

  return children
}

function HomeRoute() {
  const auth = getStoredAuth()

  if (auth && isAuthValid(auth)) {
    return <Navigate to={getRouteForRole(auth.role)} replace />
  }

  return <LandingPage />
}

function PublicLoginRoute() {
  const auth = getStoredAuth()

  if (isAuthValid(auth)) {
    return <Navigate to={getRouteForRole(auth.role)} replace />
  }

  return <LoginPage />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<PublicLoginRoute />} />

      <Route
        path={ROLE_ROUTES.admin}
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="entities/:entityKey" element={<EntityCrudPage />} />
      </Route>

      <Route
        path={ROLE_ROUTES.administrateur}
        element={
          <ProtectedRoute allowedRole="administrateur">
            <RoleLayout role="administrateur" />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleOverviewPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="modules/:moduleKey" element={<RoleModulePage />} />
      </Route>

      <Route
        path={ROLE_ROUTES.manager}
        element={
          <ProtectedRoute allowedRole="manager">
            <RoleLayout role="manager" />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleOverviewPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="modules/:moduleKey" element={<RoleModulePage />} />
      </Route>

      <Route
        path={ROLE_ROUTES.technicien}
        element={
          <ProtectedRoute allowedRole="technicien">
            <RoleLayout role="technicien" />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleOverviewPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="modules/:moduleKey" element={<RoleModulePage />} />
      </Route>

      <Route
        path={ROLE_ROUTES.chefstock}
        element={
          <ProtectedRoute allowedRole="chefstock">
            <RoleLayout role="chefstock" />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleOverviewPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="modules/:moduleKey" element={<RoleModulePage />} />
      </Route>

      <Route
        path={ROLE_ROUTES.receptioniste}
        element={
          <ProtectedRoute allowedRole="receptioniste">
            <RoleLayout role="receptioniste" />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleOverviewPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="modules/:moduleKey" element={<RoleModulePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

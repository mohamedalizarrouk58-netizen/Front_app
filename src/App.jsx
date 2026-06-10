import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import EntityCrudPage from './pages/admin/EntityCrudPage'
import UsersPage from './pages/admin/UsersPage'
import RoleLayout from './pages/roles/RoleLayout'
import RoleModulePage from './pages/roles/RoleModulePage'
import RoleOverviewPage from './pages/roles/RoleOverviewPage'
import MessagesPage from './pages/shared/MessagesPage'
import ProfilePage from './pages/shared/ProfilePage'
import {
  ChefStockOverviewPage,
  AchatPiecePage,
  FournisseursPage,
  CommandesPiecesPage,
  PrixFournisseursPage,
  DemandesPiecesAchatPage,
} from './pages/roles/chefstock'
import {
  ROLE_ROUTES,
  clearAuth,
  getRouteForRole,
  getStoredAuth,
  isAuthValid,
  normalizeRole,
} from './lib/auth'

import FournisseurLayout from './pages/roles/fournisseur/FournisseurLayout'
import FournisseurDashboardPage from './pages/roles/fournisseur/FournisseurDashboardPage'
import { MessagesProvider } from './context/MessagesContext'

function ProtectedRoute({ children, allowedRole }) {
  const auth = getStoredAuth()

  if (!isAuthValid(auth)) {
    clearAuth()
    return <Navigate to="/login" replace />
  }

  const normalizedUserRole = normalizeRole(auth.role)
  if (allowedRole && normalizedUserRole !== allowedRole) {
    return <Navigate to={getRouteForRole(normalizedUserRole)} replace />
  }

  return <MessagesProvider>{children}</MessagesProvider>
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
        <Route path="achat-piece" element={<AchatPiecePage rolePath="admin" />} />
        <Route path="fournisseurs" element={<FournisseursPage />} />
        <Route path="commandes" element={<CommandesPiecesPage />} />
        <Route path="prix" element={<PrixFournisseursPage />} />
        <Route path="suivi-achat" element={<DemandesPiecesAchatPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="entities/users" element={<UsersPage />} />
        <Route path="entities/:entityKey" element={<EntityCrudPage />} />
      </Route>

      <Route path="/administrateur/*" element={<Navigate to="/admin" replace />} />

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
        <Route path="profile" element={<ProfilePage />} />
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
        <Route path="profile" element={<ProfilePage />} />
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
        <Route index element={<ChefStockOverviewPage />} />
        <Route path="achat-piece" element={<AchatPiecePage />} />
        <Route path="suivi-achat" element={<DemandesPiecesAchatPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="modules/:moduleKey" element={<RoleModulePage />} />
        <Route path="fournisseurs" element={<FournisseursPage />} />
        <Route path="commandes" element={<CommandesPiecesPage />} />
        <Route path="prix" element={<PrixFournisseursPage />} />
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
        <Route path="profile" element={<ProfilePage />} />
        <Route path="modules/:moduleKey" element={<RoleModulePage />} />
      </Route>

      <Route
        path={ROLE_ROUTES.fournisseur}
        element={
          <ProtectedRoute allowedRole="fournisseur">
            <FournisseurLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FournisseurDashboardPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

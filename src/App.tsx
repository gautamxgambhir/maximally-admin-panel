import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { BlogList } from './pages/BlogList'
import { CreateBlog } from './pages/CreateBlog'
import { EditBlog } from './pages/EditBlog'
import { HackathonList } from './pages/HackathonList'
import { CreateHackathon } from './pages/CreateHackathon'
import { EditHackathon } from './pages/EditHackathon'
import { AdminManagement } from './pages/AdminManagement'
import { PeopleManagement } from './pages/PeopleManagement'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs"
        element={
          <ProtectedRoute>
            <Layout>
              <BlogList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs/create"
        element={
          <ProtectedRoute>
            <Layout>
              <CreateBlog />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blogs/edit/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EditBlog />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hackathons"
        element={
          <ProtectedRoute>
            <Layout>
              <HackathonList />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hackathons/create"
        element={
          <ProtectedRoute>
            <Layout>
              <CreateHackathon />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hackathons/edit/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EditHackathon />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-management"
        element={
          <ProtectedRoute>
            <Layout>
              <AdminManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/people"
        element={
          <ProtectedRoute>
            <Layout>
              <PeopleManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App

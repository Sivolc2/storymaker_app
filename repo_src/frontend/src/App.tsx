import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import './styles/App.css'
import HomePage from './pages/HomePage'
import ItemManagementPage from './pages/ItemManagementPage'
import SystemaWriterPage from './pages/SystemaWriterPage'
import { ProjectProvider } from './contexts/ProjectContext'

function App() {
  // Use empty string to rely on Vite's proxy configuration
  const apiUrl = ''

  return (
    <Router>
      <div className="app-container">
        <nav className="main-nav">
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/items">Item Management</Link></li>
            <li><Link to="/systemawriter">Storymaker</Link></li>
          </ul>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage apiUrl={apiUrl} />} />
            <Route path="/items" element={<ItemManagementPage apiUrl={apiUrl} />} />
            <Route path="/systemawriter" element={
              <ProjectProvider>
                <SystemaWriterPage apiUrl={apiUrl} />
              </ProjectProvider>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p>&copy; 2024 AI-Friendly Repository</p>
          <p>Using Vite proxy for API calls</p>
        </footer>
      </div>
    </Router>
  )
}

export default App

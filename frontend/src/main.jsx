import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import './index.css'
import './App.css'
import { ThemeProvider } from './context/ThemeContext.jsx'

// Warn in the console if this frontend's taxonomy mirror has drifted from the
// backend it is talking to. Development only.
if (import.meta.env.DEV) {
  import('./lib/verifyTaxonomy').then(({ verifyTaxonomy }) => verifyTaxonomy())
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
)

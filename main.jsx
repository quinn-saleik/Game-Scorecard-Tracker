import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { getPreferences, applyPreferences } from './data/preferences.js'

// Apply saved theme/text-size before first paint so there's no flash of
// the wrong appearance on load.
applyPreferences(getPreferences())

// HashRouter (not BrowserRouter) because GitHub Pages serves static files
// with no server-side rewrite rules — hash-based routes work with zero
// extra config.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { OperationFeedbackProvider } from './context/OperationFeedbackContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <OperationFeedbackProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </OperationFeedbackProvider>
    </ThemeProvider>
  </StrictMode>,
)

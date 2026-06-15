import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import './styles/globals.css'
import './styles/accessibility.css'
import { AuthProvider } from '@/contexts/AuthContext.tsx'
import { ThemeProvider } from '@/components/ThemeProvider'
import { OnlinePresenceProvider } from '@/hooks/useOnlinePresence'
import { Toaster } from '@/components/ui/sonner'
import { GlobalConfirmDialog } from '@/components/GlobalConfirmDialog'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" enableSystem>
        <AuthProvider>
          <OnlinePresenceProvider>
            <App />
            <GlobalConfirmDialog />
            <Toaster position="top-right" richColors closeButton />
          </OnlinePresenceProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

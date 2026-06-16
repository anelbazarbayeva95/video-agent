import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import LandingPage from './LandingPage.tsx'

function Root() {
  const [started, setStarted] = useState(false)
  return started ? <App /> : <LandingPage onStart={() => setStarted(true)} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

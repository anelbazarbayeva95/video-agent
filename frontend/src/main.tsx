import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './tailwind.css'
import './index.css'
import AssetPackApp from './components/app/AssetPackApp.tsx'
import NoirLanding from './components/landing/NoirLanding.tsx'

function Root() {
  const [started, setStarted] = useState(false)
  return started
    ? <AssetPackApp onBack={() => setStarted(false)} />
    : <NoirLanding onStart={() => setStarted(true)} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ModePage } from './pages/ModePage'
import { LanguagePage } from './pages/LanguagePage'
import { IntroPage } from './pages/IntroPage'
import { SelfGuidedPage } from './pages/SelfGuidedPage'
import { AssistedPage } from './pages/AssistedPage'
import { CompletePage } from './pages/CompletePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ModePage />} />
        <Route path="/language" element={<LanguagePage />} />
        <Route path="/intro" element={<IntroPage />} />
        <Route path="/survey/self-guided" element={<SelfGuidedPage />} />
        <Route path="/survey/assisted" element={<AssistedPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

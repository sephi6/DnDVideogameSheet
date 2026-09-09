import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/fonts.css'
import './styles/global.css'
import './styles/screens.css'
import './styles/sheet.css'
// Last: the responsive layer wins by cascade order, with no !important.
import './styles/responsive.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

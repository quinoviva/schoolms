import { createRoot } from 'react-dom/client'
import App from './App'
import { validateEnv } from './utils/env'
import './styles/index.css'

validateEnv()

window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

createRoot(document.getElementById('root')!).render(<App />)

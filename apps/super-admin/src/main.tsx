import { createRoot } from 'react-dom/client'
import App from './App'
import { validateEnv } from './utils/env'
import './styles/index.css'

validateEnv()

createRoot(document.getElementById('root')!).render(<App />)

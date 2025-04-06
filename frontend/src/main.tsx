// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // Ensure Tailwind/global styles are imported

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* ThemeProvider is now inside App.tsx, wrapping the Router */}
    <App />
  </React.StrictMode>,
)
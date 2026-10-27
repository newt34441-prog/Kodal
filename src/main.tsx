import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWAAutoUpdate } from './utils/pwaAutoUpdate';

// Initialize auto-updating service worker for installed apps & web clients
initPWAAutoUpdate();

createRoot(document.getElementById('root')!).render(<App />);

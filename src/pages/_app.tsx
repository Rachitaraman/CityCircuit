import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import '../styles/globals.css';

function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      {/* Hidden reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container" style={{ display: 'none' }}></div>
    </AuthProvider>
  );
}

export default App;
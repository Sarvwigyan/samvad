import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Samwad Application Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0705',
          color: '#f59e0b',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🕉️</div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>संवाद लोड करने में व्यवधान आया</h2>
          <p style={{ color: '#a39585', maxWidth: '420px', fontSize: '0.9rem', marginBottom: '16px' }}>
            {this.state.error?.message || "कृपया पृष्ठ को पुनः लोड करें।"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#ea580c',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            पुनः लोड करें (Reload)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

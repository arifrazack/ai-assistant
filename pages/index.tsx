import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamic import of NotchUI to prevent SSR issues
const NotchUI = dynamic(() => import('../components/NotchUI'), {
  ssr: false,
  loading: () => (
    <div className="notch-loading">
      <div className="loading-indicator">⟳</div>
    </div>
  )
});

export default function Home() {
  useEffect(() => {
    // Signal to Electron that the renderer is ready
    if (typeof window !== 'undefined' && window.electronAPI?.rendererReady) {
      window.electronAPI.rendererReady();
      console.log('🖼️ Notch renderer ready');
    }
  }, []);

  return (
    <>
      <div className="notch-app">
        <NotchUI />
                  </div>
                  
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          width: 100%;
          height: 100%;
          background: transparent;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
        }

        #__next {
          width: 100%;
          height: 100%;
          background: transparent;
        }

        .notch-app {
          width: 100%;
          height: 100%;
          background: transparent;
          display: flex;
          align-items: flex-start;
          justify-content: stretch;
        }

        .notch-loading {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(28, 28, 30, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .loading-indicator {
          color: rgba(255, 255, 255, 0.8);
          font-size: 18px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Hide scrollbars globally */
        ::-webkit-scrollbar {
          display: none;
        }

        /* Prevent text selection for cleaner notch experience */
        .notch-app {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        /* Allow text selection only in input areas */
        input, textarea {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }
      `}</style>
    </>
  )
} 
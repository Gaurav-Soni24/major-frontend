import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata = {
  title: 'Quizify - AI Powered Assessments',
  description: 'Create, manage, and attempt secure AI-graded quizzes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
        <Toaster 
          position="bottom-right" 
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            success: {
              style: { background: '#10b981' }
            },
            error: {
              style: { background: '#ef4444' }
            }
          }} 
        />
      </body>
    </html>
  );
}
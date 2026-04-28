'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import styles from './login.module.css';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const router = useRouter();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid credentials.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
        credential: credentialResponse.credential
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      toast.success('Google sign-in successful!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Google authentication failed.');
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID"}>
      <div className={styles.pageWrapper}>
        <div className={`${styles.glassPanel} ${styles.loginContainer}`}>
          <div className={styles.loginFormWrapper}>
            <div className={styles.siriIconWrapper}>
              <i className="bi bi-person-fill-lock"></i>
            </div>
            <h2 className={styles.title}>Welcome back</h2>
            <p className={styles.subtitle}>Sign in to access your educator dashboard.</p>
            
            <div className={styles.googleBtnWrapper}>
              <GoogleLogin 
                onSuccess={handleGoogleLogin} 
                onError={() => toast.error('Login Failed')} 
                shape="pill" 
                size="large" 
              />
            </div>

            <div className={styles.divider}><span>or continue with email</span></div>
            
            <form onSubmit={handleLocalLogin}>
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email Address</label>
                <input 
                  type="email" id="email" name="email" 
                  className={styles.appleInput} required placeholder="name@school.edu"
                  value={formData.email} onChange={handleInputChange}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <div className={styles.inputWrapper}>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    id="password" name="password" 
                    className={styles.appleInput} required placeholder="••••••••"
                    value={formData.password} onChange={handleInputChange}
                    style={{ paddingRight: '44px' }}
                  />
                  <i 
                    className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} ${styles.passwordToggle}`} 
                    onClick={() => setShowPassword(!showPassword)}
                  ></i>
                </div>
              </div>
              
              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? <div className={styles.appleLoaderSmall}></div> : 'Sign in to account'}
              </button>
            </form>
            
            <p className={styles.signupPrompt}>
              New to Quizify? <Link href="/register">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
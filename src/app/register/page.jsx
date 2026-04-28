'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import styles from './register.module.css'; 

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocalRegister = async (e) => {
    e.preventDefault();
    if (formData.password.length < 8) return toast.error("Password must be at least 8 characters.");
    
    setLoading(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        ...formData, role: 'teacher'
      });
      toast.success('Account created! Please log in.');
      router.push('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed.');
      setLoading(false);
    }
  };

  const handleGoogleSignup = async (credentialResponse) => {
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
        credential: credentialResponse.credential
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      toast.success('Account created via Google!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Google signup failed.');
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID"}>
      <div className={styles.pageWrapper}>
        <div className={styles.glassPanel}>
          <div className={styles.loginFormWrapper}>
            <div className={styles.siriIconWrapper}>
              <i className="bi bi-person-plus-fill"></i>
            </div>
            <h2 className={styles.title}>Create Account</h2>
            <p className={styles.subtitle}>Join Quizify as an educator today.</p>
            
            <div className={styles.googleBtnWrapper}>
              <GoogleLogin 
                onSuccess={handleGoogleSignup} 
                onError={() => toast.error('Signup Failed')} 
                shape="pill" 
                size="large" 
                text="signup_with" 
              />
            </div>

            <div className={styles.divider}><span>or sign up with email</span></div>
            
            <form onSubmit={handleLocalRegister}>
              <div className={styles.inputGroup}>
                <label htmlFor="name">Full Name</label>
                <input 
                  type="text" id="name" name="name" 
                  className={styles.appleInput} required placeholder="John Doe"
                  value={formData.name} onChange={handleInputChange}
                />
              </div>

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
                    className={styles.appleInput} required placeholder="Min 8 characters"
                    value={formData.password} onChange={handleInputChange}
                    style={{ paddingRight: '44px' }}
                  />
                  <i 
                    className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} ${styles.passwordToggle}`} 
                    onClick={() => setShowPassword(!showPassword)}
                  ></i>
                </div>
                
                <div className={styles.passwordRequirements}>
                   <div className={`${styles.reqItem} ${formData.password.length >= 8 ? styles.valid : styles.invalid}`}>
                      <i className={`bi ${formData.password.length >= 8 ? 'bi-check-circle-fill' : 'bi-circle'}`}></i> At least 8 characters
                   </div>
                </div>
              </div>
              
              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? <div className={styles.appleLoaderSmall}></div> : 'Create Account'}
              </button>
            </form>
            
            <p className={styles.signupPrompt}>
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
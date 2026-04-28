'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import styles from './profile.module.css';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    department: '',
    institution: '',
    newPassword: '',
    isPasswordSet: true,
    authProvider: 'local'
  });

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = res.data.data;
        if (isMounted) {
          setProfileData({
            name: data.name || '',
            email: data.email || '',
            bio: data.profile?.bio || '',
            department: data.profile?.department || '',
            institution: data.profile?.institution || '',
            newPassword: '',
            isPasswordSet: data.isPasswordSet,
            authProvider: data.authProvider
          });
        }
      } catch (error) {
        if (isMounted) toast.error("Failed to load profile data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        name: profileData.name,
        bio: profileData.bio,
        department: profileData.department,
        institution: profileData.institution,
      };

      if (profileData.newPassword) {
        if (profileData.newPassword.length < 8) {
          toast.error("Password must be at least 8 characters.");
          setSaving(false);
          return;
        }
        payload.newPassword = profileData.newPassword;
      }

      const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Profile updated successfully!");
      setProfileData(prev => ({ 
        ...prev, 
        newPassword: '', 
        isPasswordSet: res.data.data.isPasswordSet 
      }));

    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading your profile...</div>;
  }

  return (
    <>
      <div className={styles.dashboardHeader}>
        <div>
          <h1>Your Profile</h1>
          <p>Manage your personal information and security settings.</p>
        </div>
      </div>

      <div className={styles.profileLayout}>
        {/* Left Column: Avatar & Quick Info */}
        <div className={styles.sideCol}>
          <div className={styles.card}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarPlaceholder}>
                {profileData.name.charAt(0).toUpperCase()}
              </div>
              <h2 className={styles.profileName}>{profileData.name}</h2>
              <p className={styles.profileRole}>Educator</p>
              
              <div className={styles.authBadge}>
                {profileData.authProvider === 'google' ? (
                  <><i className="bi bi-google"></i> Signed in via Google</>
                ) : (
                  <><i className="bi bi-envelope-check"></i> Standard Account</>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className={styles.mainCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3><i className="bi bi-person-lines-fill"></i> Personal Information</h3>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Full Name</label>
                  <input 
                    type="text" name="name" 
                    className={styles.input} 
                    value={profileData.name} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className={styles.input} 
                    value={profileData.email} 
                    disabled 
                    title="Email cannot be changed"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Department / Subject</label>
                  <input 
                    type="text" name="department" 
                    className={styles.input} 
                    placeholder="e.g. Computer Science"
                    value={profileData.department} 
                    onChange={handleChange} 
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Institution / School</label>
                  <input 
                    type="text" name="institution" 
                    className={styles.input} 
                    placeholder="e.g. University of Technology"
                    value={profileData.institution} 
                    onChange={handleChange} 
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Bio</label>
                  <textarea 
                    name="bio" rows="3" 
                    className={styles.input} 
                    placeholder="A short bio about your teaching background..."
                    value={profileData.bio} 
                    onChange={handleChange} 
                  ></textarea>
                </div>
              </div>

              <div className={styles.divider}></div>

              <div className={styles.cardHeader}>
                <h3><i className="bi bi-shield-lock-fill"></i> Security</h3>
              </div>

              {!profileData.isPasswordSet && (
                <div className={styles.alertWarning}>
                  <i className="bi bi-exclamation-triangle-fill"></i>
                  <span>You signed up with Google. Set a password below if you wish to log in with your email and password in the future.</span>
                </div>
              )}

              <div className={styles.formGroup} style={{ maxWidth: '400px' }}>
                <label>{profileData.isPasswordSet ? "Change Password" : "Create Password"}</label>
                <input 
                  type="password" name="newPassword" 
                  className={styles.input} 
                  placeholder={profileData.isPasswordSet ? "Leave blank to keep current" : "Minimum 8 characters"}
                  value={profileData.newPassword} 
                  onChange={handleChange} 
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.btnSubmit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
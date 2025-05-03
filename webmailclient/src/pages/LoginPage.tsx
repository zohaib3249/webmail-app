import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LoginForm from '../components/auth/LoginForm';

export const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="relative w-full max-w-md">
        {/* Glassy container */}
        <div className="absolute inset-0 bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm rounded-xl shadow-2xl"></div>

        {/* Content */}
        <div className="relative p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
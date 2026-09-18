import React from 'react';
import { Navigate } from 'react-router-dom';

// PublicRoute redirects already authenticated owners to the home dashboard
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;

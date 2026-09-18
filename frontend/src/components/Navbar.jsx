import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const storedOwner = localStorage.getItem('owner');
  const owner = storedOwner ? JSON.parse(storedOwner) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('owner');
    navigate('/login');
    window.location.reload();
  };

  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? 'var(--primary, #4f46e5)' : 'var(--text-secondary, #475569)',
    fontWeight: isActive ? '600' : '500',
    fontSize: '14px',
    textDecoration: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    backgroundColor: isActive ? 'var(--primary-light, #eef2ff)' : 'transparent',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    whiteSpace: 'nowrap'
  });

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <NavLink to="/" className="navbar-brand">
            <div className="brand-icon">🏢</div>
            <span className="brand-name">RentSphere</span>
          </NavLink>

          {token && owner && (
            <nav className="navbar-nav">
              <NavLink to="/" end style={navLinkStyle}>
                Dashboard
              </NavLink>
              <NavLink to="/campuses" style={navLinkStyle}>
                Campuses
              </NavLink>
              <NavLink to="/rooms" style={navLinkStyle}>
                Rooms
              </NavLink>
              <NavLink to="/tenants" style={navLinkStyle}>
                Tenants
              </NavLink>
            </nav>
          )}
        </div>

        <div className="navbar-user">
          {token && owner ? (
            <div className="user-info">
              <span className="user-name">👤 {owner.name}</span>
              <button onClick={handleLogout} className="btn btn-secondary btn-logout">
                Logout
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="btn btn-primary">
              Sign In
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

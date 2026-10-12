import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const { itemCount } = useCart();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-name">Bazaar</span>
          <span className="navbar-brand-subtitle">Your Everyday Marketplace</span>
        </Link>

        <nav className="navbar-links">
          <Link to="/" className="navbar-link">Home</Link>
          <Link to="/wishlist" className="navbar-link">Wishlist</Link>

          {isAuthenticated && (
            <Link to="/orders" className="navbar-link">Orders</Link>
          )}

          {isAdmin && (
            <Link to="/admin" className="navbar-link">Admin</Link>
          )}

          {isAuthenticated ? (
            <>
              <Link to="/profile" className="navbar-link">
                {user?.firstName ? `Hi, ${user.firstName}` : "Profile"}
              </Link>
              <button type="button" className="navbar-link navbar-logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">Login</Link>
              <Link to="/register" className="navbar-link">Register</Link>
            </>
          )}

          <Link to="/cart" className="navbar-cart">
            Cart
            <span className="navbar-cart-badge">{itemCount}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

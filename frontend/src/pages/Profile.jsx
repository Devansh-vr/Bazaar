import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null; // ProtectedRoute guarantees this won't render while logged out

  return (
    <div className="page page-narrow">
      <div className="glass-card">
        <h1>My Profile</h1>

        <div className="profile-details">
          <div className="profile-row">
            <span className="muted">Name</span>
            <span>{user.firstName} {user.lastName}</span>
          </div>
          <div className="profile-row">
            <span className="muted">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="profile-row">
            <span className="muted">Role</span>
            <span>{user.role}</span>
          </div>
          <div className="profile-row">
            <span className="muted">Member since</span>
            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <button type="button" className="btn-primary btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;

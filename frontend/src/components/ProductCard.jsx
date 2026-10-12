import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";

const ProductCard = ({ product }) => {
  const { isAuthenticated } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const navigate = useNavigate();

  if (!product) return null;

  const { _id, title, price, images } = product;
  const image = images?.[0];
  const inWishlist = isInWishlist(_id);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    toggleWishlist(_id);
  };

  return (
    <Link to={`/products/${_id}`} className="product-card">
      <div className="product-card-image">
        {image ? (
          <img src={image} alt={title} />
        ) : (
          <div className="product-card-image-placeholder">No image</div>
        )}
        <button
          type="button"
          className={`wishlist-btn ${inWishlist ? "wishlist-btn-active" : ""}`}
          onClick={handleWishlistClick}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          {inWishlist ? "♥" : "♡"}
        </button>
      </div>
      <div className="product-card-body">
        <h3 className="product-card-title">{title}</h3>
        <p className="product-card-price">₹{price}</p>
      </div>
    </Link>
  );
};

export default ProductCard;

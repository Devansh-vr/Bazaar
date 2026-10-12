import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchProductById } from "../services/productService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import ReviewSection from "../components/ReviewSection.jsx";
import Loading from "../components/Loading.jsx";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [adding, setAdding] = useState(false);

  const refreshProductRating = async () => {
    try {
      const res = await fetchProductById(id);
      setProduct(res.data.data);
    } catch {
      // non-critical — the review list itself already refreshed
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      setNotFound(false);
      try {
        const res = await fetchProductById(id);
        if (!cancelled) setProduct(res.data.data);
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 404 || err.response?.status === 400) {
          setNotFound(true);
        } else {
          setError("Couldn't load this product right now. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setAdding(true);
    setCartMessage("");
    const result = await addToCart(product._id, quantity);
    setCartMessage(result.success ? "Added to cart!" : result.message);
    setAdding(false);
  };

  const handleWishlistClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    toggleWishlist(product._id);
  };

  if (loading) return <Loading />;

  if (notFound) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <h1>Product Not Found</h1>
          <p className="muted">This product doesn&apos;t exist or may have been removed.</p>
          <Link to="/" className="btn-primary">Back to Catalog</Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <p>{error}</p>
          <Link to="/" className="btn-primary">Back to Catalog</Link>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const image = product.images?.[0];
  const inWishlist = isInWishlist(product._id);
  const outOfStock = product.stock <= 0;

  return (
    <div className="page">
      <div className="glass-card product-details">
        <div className="product-details-image">
          {image ? (
            <img src={image} alt={product.title} />
          ) : (
            <div className="product-card-image-placeholder">No image</div>
          )}
        </div>

        <div className="product-details-body">
          <div className="product-details-title-row">
            <h1>{product.title}</h1>
            <button
              type="button"
              className={`wishlist-btn wishlist-btn-inline ${inWishlist ? "wishlist-btn-active" : ""}`}
              onClick={handleWishlistClick}
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              {inWishlist ? "♥" : "♡"}
            </button>
          </div>

          <p className="product-details-price">₹{product.price}</p>

          <div className="product-details-meta">
            <span className="badge">{product.category}</span>
            {product.brand && <span className="badge">{product.brand}</span>}
            {product.averageRating > 0 && (
              <span className="badge">★ {product.averageRating.toFixed(1)} ({product.totalRatings})</span>
            )}
            <span className={`badge ${outOfStock ? "badge-danger" : "badge-success"}`}>
              {outOfStock ? "Out of stock" : `${product.stock} in stock`}
            </span>
          </div>

          <p className="product-details-description">{product.description}</p>

          {!outOfStock && (
            <div className="add-to-cart-row">
              <div className="cart-row-quantity">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleAddToCart}
                disabled={adding}
              >
                {adding ? "Adding..." : "Add to Cart"}
              </button>
            </div>
          )}

          {cartMessage && <p className="muted">{cartMessage} <Link to="/cart">View cart</Link></p>}
        </div>
      </div>

      <div className="glass-card">
        <ReviewSection productId={product._id} onRatingChange={refreshProductRating} />
      </div>
    </div>
  );
};

export default ProductDetails;

import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext.jsx";
import ProductCard from "../components/ProductCard.jsx";
import Loading from "../components/Loading.jsx";

const WishlistPage = () => {
  const { wishlist, loading, error, refreshWishlist } = useWishlist();

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={refreshWishlist}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <h1>Your Wishlist</h1>
          <p className="muted">Your wishlist is empty.</p>
          <Link to="/" className="btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="glass-card">
        <h1>Your Wishlist</h1>
      </div>
      <div className="product-grid">
        {wishlist.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;

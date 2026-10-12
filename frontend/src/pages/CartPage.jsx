import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import Loading from "../components/Loading.jsx";

const CartPage = () => {
  const {
    items,
    subtotal,
    itemCount,
    loading,
    error,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
  } = useCart();

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={refreshCart}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <div className="glass-card catalog-state">
          <h1>Your Cart</h1>
          <p className="muted">Your cart is empty.</p>
          <Link to="/" className="btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="glass-card">
        <div className="cart-header">
          <h1>Your Cart</h1>
          <button type="button" className="cart-clear-btn" onClick={clearCart}>
            Clear Cart
          </button>
        </div>

        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.product._id} className="cart-row">
              <Link to={`/products/${item.product._id}`} className="cart-row-image">
                {item.product.images?.[0] ? (
                  <img src={item.product.images[0]} alt={item.product.title} />
                ) : (
                  <div className="product-card-image-placeholder">No image</div>
                )}
              </Link>

              <div className="cart-row-info">
                <Link to={`/products/${item.product._id}`} className="cart-row-title">
                  {item.product.title}
                </Link>
                <p className="muted">₹{item.product.price} each</p>
              </div>

              <div className="cart-row-quantity">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => decreaseQuantity(item.product._id)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => increaseQuantity(item.product._id)}
                  disabled={item.quantity >= item.product.stock}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <p className="cart-row-total">₹{item.product.price * item.quantity}</p>

              <button
                type="button"
                className="cart-row-remove"
                onClick={() => removeFromCart(item.product._id)}
                aria-label="Remove item"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="cart-summary">
          <span className="muted">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
          <span className="cart-subtotal">Subtotal: ₹{subtotal}</span>
        </div>

        <Link to="/checkout" className="btn-primary checkout-pay-btn">
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
};

export default CartPage;

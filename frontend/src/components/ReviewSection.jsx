import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchProductReviews, submitReview, deleteOwnReview } from "../services/productService.js";
import Loading from "./Loading.jsx";

const Stars = ({ value }) => (
  <span className="review-stars">{"★".repeat(value)}{"☆".repeat(5 - value)}</span>
);

const RatingPicker = ({ value, onChange }) => (
  <div className="rating-picker">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        className={`rating-star-btn ${n <= value ? "filled" : ""}`}
        onClick={() => onChange(n)}
        aria-label={`${n} star${n !== 1 ? "s" : ""}`}
      >
        ★
      </button>
    ))}
  </div>
);

const ReviewSection = ({ productId, onRatingChange }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const myReview = reviews.find((r) => r.user?._id === user?.id);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchProductReviews(productId);
      setReviews(res.data.data);
    } catch {
      setError("Couldn't load reviews.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment || "");
    }
  }, [myReview?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (rating < 1) {
      setFormError("Please select a star rating.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await submitReview(productId, { rating, comment });
      await load();
      onRatingChange?.();
    } catch (err) {
      setFormError(err.response?.data?.message || "Couldn't submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteOwnReview(productId);
      setRating(0);
      setComment("");
      await load();
      onRatingChange?.();
    } catch (err) {
      setFormError(err.response?.data?.message || "Couldn't delete review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-section">
      <h2>Reviews {reviews.length > 0 && `(${reviews.length})`}</h2>

      {isAuthenticated ? (
        <form className="review-form" onSubmit={handleSubmit}>
          <RatingPicker value={rating} onChange={setRating} />
          <textarea
            placeholder="Share your thoughts about this product (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={1000}
          />
          {formError && <div className="form-error">{formError}</div>}
          <div className="admin-form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
            </button>
            {myReview && (
              <button type="button" className="cart-clear-btn" onClick={handleDelete} disabled={submitting}>
                Delete My Review
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="muted">
          <button type="button" className="admin-link-btn" onClick={() => navigate("/login")}>
            Log in
          </button>{" "}
          to leave a review.
        </p>
      )}

      {loading && <Loading />}

      {!loading && error && <p className="muted">{error}</p>}

      {!loading && !error && reviews.length === 0 && (
        <p className="muted">No reviews yet — be the first!</p>
      )}

      {!loading && !error && reviews.length > 0 && (
        <ul className="review-list">
          {reviews.map((review) => (
            <li key={review._id} className="review-item">
              <div className="review-item-header">
                <span>{review.user ? `${review.user.firstName} ${review.user.lastName}` : "Anonymous"}</span>
                <Stars value={review.rating} />
              </div>
              {review.comment && <p className="review-comment">{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ReviewSection;

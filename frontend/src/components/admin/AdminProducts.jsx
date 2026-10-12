import { useState, useEffect, useCallback } from "react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../services/productService.js";
import Loading from "../Loading.jsx";

const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  category: "",
  brand: "",
  stock: "",
  images: "", // comma-separated URLs in the UI, split into an array on submit
};

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null); // null = not editing, "new" = creating
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchProducts({ limit: 50, sort: "newest" });
      setProducts(res.data.data);
    } catch {
      setError("Couldn't load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setEditingId("new");
    setFormData(EMPTY_FORM);
    setFormError("");
  };

  const startEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      title: product.title,
      description: product.description,
      price: String(product.price),
      category: product.category,
      brand: product.brand || "",
      stock: String(product.stock),
      images: (product.images || []).join(", "),
    });
    setFormError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError("");
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const payload = {
      title: formData.title,
      description: formData.description,
      price: formData.price,
      category: formData.category,
      brand: formData.brand,
      stock: formData.stock,
      images: formData.images
        ? formData.images.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };

    try {
      if (editingId === "new") {
        await createProduct(payload);
      } else {
        await updateProduct(editingId, payload);
      }
      cancelEdit();
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Couldn't save product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete product.");
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="admin-section-header">
        <h2>Products</h2>
        {editingId === null && (
          <button type="button" className="btn-primary" onClick={startCreate}>
            + New Product
          </button>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      {editingId !== null && (
        <form className="auth-form admin-product-form" onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <label>
              Title
              <input type="text" name="title" value={formData.title} onChange={handleChange} required />
            </label>
            <label>
              Category
              <input type="text" name="category" value={formData.category} onChange={handleChange} required />
            </label>
            <label>
              Brand
              <input type="text" name="brand" value={formData.brand} onChange={handleChange} />
            </label>
            <label>
              Price
              <input type="number" name="price" min="0" step="0.01" value={formData.price} onChange={handleChange} required />
            </label>
            <label>
              Stock
              <input type="number" name="stock" min="0" step="1" value={formData.stock} onChange={handleChange} required />
            </label>
            <label>
              Image URLs (comma-separated)
              <input type="text" name="images" value={formData.images} onChange={handleChange} placeholder="https://... , https://..." />
            </label>
          </div>
          <label>
            Description
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} required />
          </label>

          {formError && <div className="form-error">{formError}</div>}

          <div className="admin-form-actions">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : editingId === "new" ? "Create Product" : "Save Changes"}
            </button>
            <button type="button" className="cart-clear-btn" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id}>
                <td>{product.title}</td>
                <td>{product.category}</td>
                <td>₹{product.price}</td>
                <td className={product.stock <= 5 ? "admin-low-stock" : ""}>{product.stock}</td>
                <td>{product.averageRating > 0 ? `★ ${product.averageRating.toFixed(1)}` : "—"}</td>
                <td className="admin-table-actions">
                  <button type="button" className="admin-link-btn" onClick={() => startEdit(product)}>Edit</button>
                  <button type="button" className="admin-link-btn admin-link-danger" onClick={() => handleDelete(product._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="muted">No products yet.</p>}
      </div>
    </div>
  );
};

export default AdminProducts;

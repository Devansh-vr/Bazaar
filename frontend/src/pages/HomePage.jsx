import { useState, useEffect, useCallback } from "react";
import { fetchProducts, fetchProductFilters } from "../services/productService.js";
import ProductCard from "../components/ProductCard.jsx";
import Loading from "../components/Loading.jsx";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

// Debounces the search box so we don't fire a request on every keystroke.
const useDebouncedValue = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const HomePage = () => {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput);

  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [filterOptions, setFilterOptions] = useState({ categories: [], brands: [] });

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load filter dropdown options once on mount.
  useEffect(() => {
    fetchProductFilters()
      .then((res) => setFilterOptions({ categories: res.data.categories, brands: res.data.brands }))
      .catch(() => {
        // Non-critical — filters just won't be populated if this fails.
      });
  }, []);

  // Reset to page 1 whenever a filter/search/sort changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, brand, sort]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchProducts({
        page,
        limit: 12,
        search: debouncedSearch || undefined,
        category: category || undefined,
        brand: brand || undefined,
        sort,
      });
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      setError("Couldn't load products right now. Please try again.");
      setProducts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, category, brand, sort]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div className="page">
      <section className="hero glass-card">
        <h1>Welcome to Bazaar</h1>
        <p className="muted">Browse the full catalog below.</p>
      </section>

      <section className="catalog-controls glass-card">
        <input
          type="text"
          className="catalog-search"
          placeholder="Search products by title..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <div className="catalog-filters">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">All Brands</option>
            {filterOptions.brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </section>

      {loading && <Loading />}

      {!loading && error && (
        <div className="glass-card catalog-state">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={loadProducts}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="glass-card catalog-state">
          <p>No products found. Try adjusting your search or filters.</p>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="pagination-btn"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;

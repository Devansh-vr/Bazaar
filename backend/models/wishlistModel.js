import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one persistent wishlist per authenticated customer
    },
    products: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
  },
  { timestamps: true }
);

// Note: no separate wishlistSchema.index({ user: 1 }) call here — the
// `unique: true` on the field above already creates that index.

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

export default Wishlist;

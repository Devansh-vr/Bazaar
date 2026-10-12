const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates registration input. Returns an array of error messages
 * (empty array = valid).
 */
export const validateRegisterInput = ({ firstName, lastName, email, password }) => {
  const errors = [];

  if (!firstName || !firstName.trim()) {
    errors.push("First name is required");
  }
  if (!lastName || !lastName.trim()) {
    errors.push("Last name is required");
  }
  if (!email || !email.trim()) {
    errors.push("Email is required");
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push("Please provide a valid email address");
  }
  if (!password) {
    errors.push("Password is required");
  } else if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  return errors;
};

/**
 * Validates login input.
 */
export const validateLoginInput = ({ email, password }) => {
  const errors = [];

  if (!email || !email.trim()) {
    errors.push("Email is required");
  }
  if (!password) {
    errors.push("Password is required");
  }

  return errors;
};

/**
 * Validates product create/update input. `partial` allows PUT requests
 * to send only the fields being changed without failing on omitted ones.
 */
export const validateProductInput = (
  { title, description, price, category, stock },
  { partial = false } = {}
) => {
  const errors = [];

  if (!partial || title !== undefined) {
    if (!title || !String(title).trim()) {
      errors.push("Title is required");
    }
  }
  if (!partial || description !== undefined) {
    if (!description || !String(description).trim()) {
      errors.push("Description is required");
    }
  }
  if (!partial || price !== undefined) {
    if (price === undefined || price === null || price === "") {
      errors.push("Price is required");
    } else if (Number.isNaN(Number(price)) || Number(price) < 0) {
      errors.push("Price must be a non-negative number");
    }
  }
  if (!partial || category !== undefined) {
    if (!category || !String(category).trim()) {
      errors.push("Category is required");
    }
  }
  if (stock !== undefined && stock !== null && stock !== "") {
    if (Number.isNaN(Number(stock)) || Number(stock) < 0) {
      errors.push("Stock must be a non-negative number");
    }
  }

  return errors;
};

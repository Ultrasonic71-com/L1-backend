/**
 * Validates if a string is a properly formatted URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - Whether the URL is valid
 */
export const isValidUrl = (url) => {
  try {
    // Check if URL is valid by creating a URL object
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validates a custom alias for a URL shortener
 * @param {string} alias - The custom alias to validate
 * @returns {boolean} - Whether the alias is valid
 */
export const isValidAlias = (alias) => {
  if (!alias) return false;

  // Alias should be alphanumeric with possible hyphens and underscores
  const aliasRegex = /^[a-zA-Z0-9_-]+$/;

  // Check length and format
  return alias.length >= 3 && alias.length <= 30 && aliasRegex.test(alias);
};

/**
 * Validates if a date string is valid and in the future
 * @param {string} dateString - The date string to validate
 * @returns {boolean} - Whether the date is valid and in the future
 */
export const isValidExpiryDate = (dateString) => {
  if (!dateString) return false;

  const expiryDate = new Date(dateString);
  const now = new Date();

  // Check if date is valid and in the future
  return !isNaN(expiryDate) && expiryDate > now;
};

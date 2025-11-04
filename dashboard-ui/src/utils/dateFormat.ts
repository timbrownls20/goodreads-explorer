/**
 * Format ISO date string to readable format
 * @param dateString - ISO 8601 date string (e.g., "2024-11-02")
 * @param format - Format type: 'short', 'medium', 'long'
 * @returns Formatted date string
 */
export const formatDate = (
  dateString: string | null | undefined,
  format: 'short' | 'medium' | 'long' = 'medium',
): string => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);

    switch (format) {
      case 'short':
        // e.g., "11/02/24"
        return date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
        });

      case 'medium':
        // e.g., "Nov 2, 2024"
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

      case 'long':
        // e.g., "November 2, 2024"
        return date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

      default:
        return dateString;
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

/**
 * Format number to locale string with commas
 * @param value - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('en-US');
};

/**
 * Format decimal to fixed decimal places
 * @param value - Decimal number
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted decimal string
 */
export const formatDecimal = (
  value: number | null | undefined,
  decimals: number = 1,
): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(decimals);
};

/**
 * Format percentage
 * @param value - Percentage value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number | null | undefined,
  decimals: number = 1,
): string => {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

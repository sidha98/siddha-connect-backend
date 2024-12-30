const getUTCDate = (dateStr) => new Date(`${dateStr}T00:00:00Z`);
const getUTCStartOfMonth = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
const getUTCEndOfMonth = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));
const getCurrentDateUTC = () => new Date(new Date().toISOString());

// Utility function to subtract a month and handle edge cases
const getPreviousMonthDates = (startDate, endDate) => {
  // Adjust start date to the previous month
  let previousMonthStartDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() - 1, startDate.getUTCDate()));
  
  // Adjust end date to the previous month
  let previousMonthEndDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - 1, endDate.getUTCDate()));

  // Handle edge case: If the resulting date is invalid (e.g., Feb 30), adjust to the last valid date
  if (previousMonthStartDate.getUTCDate() !== startDate.getUTCDate()) {
      previousMonthStartDate.setUTCDate(0); // Set to last day of the previous month
  }
  if (previousMonthEndDate.getUTCDate() !== endDate.getUTCDate()) {
      previousMonthEndDate.setUTCDate(0); // Set to last day of the previous month
  }

  return { previousMonthStartDate, previousMonthEndDate };
};

// Export all functions
module.exports = {
    getUTCDate,
    getUTCStartOfMonth,
    getUTCEndOfMonth,
    getCurrentDateUTC,
    getPreviousMonthDates,
  };
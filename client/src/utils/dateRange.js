const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DATE_RANGE_PRESETS = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_365_days", label: "Last 365 days" },
  { value: "custom", label: "Custom date" },
];

export const toDateInputValue = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const getRelativeDateRange = (preset = "last_7_days", baseDate = new Date()) => {
  const endDate = endOfDay(baseDate);
  const startDate = new Date(endDate);

  if (preset === "last_365_days") {
    startDate.setDate(startDate.getDate() - 364);
  } else if (preset === "last_30_days") {
    startDate.setDate(startDate.getDate() - 29);
  } else {
    startDate.setDate(startDate.getDate() - 6);
  }

  return {
    startDate: startOfDay(startDate),
    endDate,
  };
};

export const resolveDateRange = ({
  rangeType = "last_7_days",
  customStartDate,
  customEndDate,
} = {}) => {
  if (rangeType === "custom") {
    const start = customStartDate ? new Date(customStartDate) : null;
    const end = customEndDate ? new Date(customEndDate) : null;

    if (start && !Number.isNaN(start.getTime()) && end && !Number.isNaN(end.getTime())) {
      const startDate = start <= end ? start : end;
      const endDate = start <= end ? end : start;
      return {
        startDate: startOfDay(startDate),
        endDate: endOfDay(endDate),
      };
    }
  }

  return getRelativeDateRange(rangeType);
};

export const formatDateRangeLabel = ({ startDate, endDate } = {}) => {
  if (!startDate || !endDate) return "No range selected";

  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const sameYear = startYear === endYear;

  const startOptions = sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" };
  const endOptions = { month: "short", day: "numeric", year: "numeric" };

  return `${start.toLocaleDateString("en-US", startOptions)} - ${end.toLocaleDateString("en-US", endOptions)}`;
};

export const getDateRangePreviewLabel = (rangeType = "last_7_days") => {
  if (rangeType === "last_30_days") return "Last 30 days";
  if (rangeType === "last_365_days") return "Last 365 days";
  if (rangeType === "custom") return "Custom date";
  return "Last 7 days";
};

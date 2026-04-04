import { useEffect, useMemo, useState } from "react";
import {
  formatDateRangeLabel,
  getRelativeDateRange,
  resolveDateRange,
  toDateInputValue,
} from "@/utils/dateRange";

export function useDateRange(defaultRangeType = "last_7_days") {
  const [rangeType, setRangeType] = useState(defaultRangeType);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const preset = getRelativeDateRange(defaultRangeType);
    return toDateInputValue(preset.startDate);
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const preset = getRelativeDateRange(defaultRangeType);
    return toDateInputValue(preset.endDate);
  });

  useEffect(() => {
    if (rangeType === "custom") {
      return;
    }

    const preset = getRelativeDateRange(rangeType);
    setCustomStartDate(toDateInputValue(preset.startDate));
    setCustomEndDate(toDateInputValue(preset.endDate));
  }, [rangeType]);

  const dateRange = useMemo(
    () =>
      resolveDateRange({
        rangeType,
        customStartDate,
        customEndDate,
      }),
    [customEndDate, customStartDate, rangeType],
  );

  const dateRangeLabel = useMemo(
    () => formatDateRangeLabel(dateRange),
    [dateRange],
  );

  return {
    rangeType,
    setRangeType,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateRange,
    dateRangeLabel,
  };
}

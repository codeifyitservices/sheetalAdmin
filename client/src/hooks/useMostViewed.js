import { useState, useEffect } from "react";
import { getMostViewedProducts } from "../services/productService";

export function useMostViewed(limit = 5, period = "overall", refDate = "") {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getMostViewedProducts(limit, period, refDate)
      .then((data) => {
        if (!isMounted) return;
        setItems(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [limit, period, refDate]);

  return { items, loading, error };
}

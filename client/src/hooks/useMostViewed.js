import { useState, useEffect } from "react";
import { getMostViewedProducts } from "../services/productService";

export function useMostViewed(limit = 5, options = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getMostViewedProducts(limit, options)
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
  }, [limit, options]);

  return { items, loading, error };
}

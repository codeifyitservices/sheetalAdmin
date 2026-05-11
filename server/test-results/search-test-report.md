# Search Engine Test Report

**Date:** 2026-05-11T07:56:35.420Z

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 78 |
| Passed | 73 |
| Failed | 2 |
| Accuracy | 93.59% |

## Results by Group

| Group | Total | Passed | Failed | Accuracy |
|-------|-------|--------|--------|----------|
| Categories | 9 | 8 | 1 | 88.89% |
| Products | 20 | 20 | 0 | 100.00% |
| Attributes | 30 | 30 | 0 | 100.00% |
| Typos | 8 | 4 | 1 | 50.00% |
| Partials | 6 | 6 | 0 | 100.00% |
| Substrings | 5 | 5 | 0 | 100.00% |

## Failed Test Details

| Group | Query | Expected Products | Returned Products | Reason |
|-------|-------|-------------------|-------------------|--------|
| category | Test Category Name | Test Product New Excel one, Test-1 Product New Excel one, Test-3 Product New Excel Three | Test Product New Excel Three | Missing 3 products from category |
| typo | shrt | Blue Printed Straight Shirt | Test Product Name | Typo query did not find expected matching products |

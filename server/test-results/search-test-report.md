# Search Engine Test Report

**Date:** 2026-05-11T06:49:39.417Z

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 78 |
| Passed | 65 |
| Failed | 10 |
| Accuracy | 83.33% |

## Test Results by Category

| Category | Total | Passed | Failed | Accuracy |
|----------|-------|--------|--------|----------|
| Categories | 9 | 9 | 0 | 100.00% |
| Products | 20 | 18 | 2 | 90.00% |
| Attributes | 30 | 24 | 6 | 80.00% |
| Typos | 8 | 4 | 1 | 50.00% |
| Partials | 6 | 5 | 1 | 83.33% |
| Substrings | 5 | 5 | 0 | 100.00% |

## Failed Test Details

| Category  | Query                       | Expected                                                                                                                                   | Actual                                                                                                                                     | Reason                                             |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| product   | Blue Printed Straight Shirt | 69b40cafcbcaa26df00a1f97                                                                                                                   | 69f2f4fecf9ce873ef15375d                                                                                                                   | Exact product name not found in results            |
| product   | Test Product Name           | 69f2f4fecf9ce873ef15375d                                                                                                                   | 69f855b285960b6137ff5119,69f855b285960b6137ff510b,69f88f7443cf72d84aa5d652,69f88f7443cf72d84aa5d660                                        | Exact product name not found in results            |
| attribute | red                         | 69af16f719c6e200a9789980, 69b4113ecbcaa26df00a212c, 69be479f53350ea1e8d02b56, 69f46410ce8dc13bff8c8cfd, 69f855b285960b6137ff5112, ... (+1) | 69af16f719c6e200a9789980, 69b4113ecbcaa26df00a212c, 69f855b285960b6137ff5119, 69f88f7443cf72d84aa5d660, 69c39c0804576e83e1f657fc, ... (+4) | Only 33% of expected products found                |
| attribute | Festive                     | 69af16f719c6e200a9789980, 69c39c0804576e83e1f657fc, 69f46410ce8dc13bff8c8cf6, 69f46410ce8dc13bff8c8cfd, 69f46410ce8dc13bff8c8d03, ... (+6) | 69f2f4fecf9ce873ef15375d                                                                                                                   | Only 0% of expected products found                 |
| attribute | Saree                       | 69af16f719c6e200a9789980,69f2f4fecf9ce873ef15375d,69f46410ce8dc13bff8c8d03,69f855b285960b6137ff5119,69f88f7443cf72d84aa5d660               | 6970ac630661501cf9f996d2,6970b0890661501cf9f9977a,69af16f719c6e200a9789980,69f46410ce8dc13bff8c8d03                                        | Only 40% of expected products found                |
| attribute | Straight Cut                | 69b4113ecbcaa26df00a212c                                                                                                                   | 69f855b285960b6137ff5119,69f855b285960b6137ff510b,69f88f7443cf72d84aa5d652,69f88f7443cf72d84aa5d660                                        | Only 0% of expected products found                 |
| attribute | Anarkali set                | 69b4113ecbcaa26df00a212c                                                                                                                   | 69b40cafcbcaa26df00a1f97,69b40f4fcbcaa26df00a20a8,69c37415102e42f3e2c9ee6b                                                                 | Only 0% of expected products found                 |
| attribute | long                        | 69b52c6d878711772819861f                                                                                                                   | 69be456e53350ea1e8d02ae2,69be479f53350ea1e8d02b56,69f46410ce8dc13bff8c8cf6                                                                 | Only 0% of expected products found                 |
| typo      | shrt                        | 69b40cafcbcaa26df00a1f97                                                                                                                   | 69f2f4fecf9ce873ef15375d                                                                                                                   | Typo query did not find expected matching products |
| partial   | linen                       | -                                                                                                                                          | -                                                                                                                                          | No results for partial query                       |

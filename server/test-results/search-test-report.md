# Search Engine Test Report

**Date:** 2026-05-18T06:21:55.640Z

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 76 |
| Passed | 67 |
| Failed | 9 |
| Overall Accuracy | 88.16% |

## Results by Group

| Group | Total | Passed | Failed | Accuracy |
|-------|-------|--------|--------|----------|
| Categories | 10 | 10 | 0 | 100.00% |
| Products | 20 | 20 | 0 | 100.00% |
| Attributes | 30 | 22 | 8 | 73.33% |
| Typos | 5 | 5 | 0 | 100.00% |
| Partials | 6 | 5 | 1 | 83.33% |
| Substrings | 5 | 5 | 0 | 100.00% |

## All Test Results

| # | Group | Query | Status | Expected (count) | Returned (count) | Notes |
|---|-------|-------|--------|-----------------|-----------------|-------|
| 1 | category | `Sarees` | ✅ PASS | Onion Pink Zariwork Tissue Saree; Libas; Elegant Red Silk Saree; Aarini Saree | Onion Pink Zariwork Tissue Saree; Libas; Elegant Red Silk Saree; Aarini Saree | All 4 products returned, none extra |
| 2 | category | `Suits` | ✅ PASS | Onion Pink Cotton Printed Anarkali Suit Set; Blue Chanderi Solid Gathered Suit Set; Ziya Suit Set | Onion Pink Cotton Printed Anarkali Suit Set; Blue Chanderi Solid Gathered Suit Set; Ziya Suit Set | All 3 products returned, none extra |
| 3 | category | `Lehenga` | ✅ PASS | Lookbook Art; RIRASA; Swapnil Lehenga | Lookbook Art; RIRASA; Swapnil Lehenga | All 3 products returned, none extra |
| 4 | category | `Kaftan` | ✅ PASS | Black & White Kaftan | Black & White Kaftan | All 1 products returned, none extra |
| 5 | category | `Dresses` | ✅ PASS | Kharakapas; Elegant Beige Flowy Mini Dress; Mustard Yellow Printed Flared Dress | Kharakapas; Elegant Beige Flowy Mini Dress; Mustard Yellow Printed Flared Dress | All 3 products returned, none extra |
| 6 | category | `Kurta Sets` | ✅ PASS | Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Rajnandii | Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Rajnandii | All 3 products returned, none extra |
| 7 | category | `Test Shirt` | ✅ PASS | Test Product Name | Test Product Name | All 1 products returned, none extra |
| 8 | category | `test` | ✅ PASS | Test Product New Excel Two; Test-2 Product New Excel Two | Test Product New Excel Two; Test-2 Product New Excel Two | All 2 products returned, none extra |
| 9 | category | `Test Category Name` | ✅ PASS | Test Product New Excel Three; Test Product New Excel one; Test-1 Product New Excel one; Test-3 Product New Excel Three | Test Product New Excel Three; Test Product New Excel one; Test-1 Product New Excel one; Test-3 Product New Excel Three | All 4 products returned, none extra |
| 10 | category | `Pants` | ✅ PASS | Tattered Jeans | Tattered Jeans | All 1 products returned, none extra |
| 11 | product | `Onion Pink Zariwork Tissue Saree` | ✅ PASS | Onion Pink Zariwork Tissue Saree | Onion Pink Zariwork Tissue Saree | Product found in results |
| 12 | product | `Libas` | ✅ PASS | Libas | Libas | Product found in results |
| 13 | product | `Onion Pink Cotton Printed Anarkali Suit Set` | ✅ PASS | Onion Pink Cotton Printed Anarkali Suit Set | Onion Pink Cotton Printed Anarkali Suit Set | Product found in results |
| 14 | product | `Elegant Red Silk Saree` | ✅ PASS | Elegant Red Silk Saree | Elegant Red Silk Saree | Product found in results |
| 15 | product | `Black & White Kaftan` | ✅ PASS | Black & White Kaftan | Black & White Kaftan | Product found in results |
| 16 | product | `Blue Printed Straight Shirt` | ✅ PASS | Blue Printed Straight Shirt | Blue Printed Straight Shirt | Product found in results |
| 17 | product | `Navy Blue Floral Printed Straight Kurta` | ✅ PASS | Navy Blue Floral Printed Straight Kurta | Navy Blue Floral Printed Straight Kurta | Product found in results |
| 18 | product | `Blue Chanderi Solid Gathered Suit Set` | ✅ PASS | Blue Chanderi Solid Gathered Suit Set | Blue Chanderi Solid Gathered Suit Set | Product found in results |
| 19 | product | `Kharakapas` | ✅ PASS | Kharakapas | Kharakapas | Product found in results |
| 20 | product | `Elegant Beige Flowy Mini Dress` | ✅ PASS | Elegant Beige Flowy Mini Dress | Elegant Beige Flowy Mini Dress | Product found in results |
| 21 | product | `Lookbook Art` | ✅ PASS | Lookbook Art | Lookbook Art | Product found in results |
| 22 | product | `RIRASA` | ✅ PASS | RIRASA | RIRASA | Product found in results |
| 23 | product | `Rajnandii` | ✅ PASS | Rajnandii | Rajnandii | Product found in results |
| 24 | product | `Mustard Yellow Printed Flared Dress` | ✅ PASS | Mustard Yellow Printed Flared Dress | Mustard Yellow Printed Flared Dress | Product found in results |
| 25 | product | `Test Product Name` | ✅ PASS | Test Product Name | Test Product Name | Product found in results |
| 26 | product | `Swapnil Lehenga` | ✅ PASS | Swapnil Lehenga | Swapnil Lehenga | Product found in results |
| 27 | product | `Ziya Suit Set` | ✅ PASS | Ziya Suit Set | Ziya Suit Set | Product found in results |
| 28 | product | `Aarini Saree` | ✅ PASS | Aarini Saree | Aarini Saree | Product found in results |
| 29 | product | `Test Product New Excel Three` | ✅ PASS | Test Product New Excel Three | Test Product New Excel Three; Test-3 Product New Excel Three; Test Product New Excel Two; Test-2 Product New Excel Two | Product found in results |
| 30 | product | `Test Product New Excel one` | ✅ PASS | Test Product New Excel one | Test Product New Excel one; Test-1 Product New Excel one | Product found in results |
| 31 | attribute | `Cotton` | ✅ PASS | Onion Pink Zariwork Tissue Saree; Onion Pink Cotton Printed Anarkali Suit Set; Black & White Kaftan; Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta *(+5 more)* | Onion Pink Cotton Printed Anarkali Suit Set; Kharakapas; Onion Pink Zariwork Tissue Saree; Black & White Kaftan; Blue Printed Straight Shirt *(+5 more)* | recall 10/10 (100%) |
| 32 | attribute | `anniversary` | ✅ PASS | Onion Pink Zariwork Tissue Saree | Onion Pink Zariwork Tissue Saree | recall 1/1 (100%) |
| 33 | attribute | `Silk` | ✅ PASS | Libas; Elegant Red Silk Saree; RIRASA; Swapnil Lehenga; Aarini Saree *(+4 more)* | Elegant Red Silk Saree; Aarini Saree; Libas; RIRASA; Test Product New Excel Three *(+4 more)* | recall 9/9 (100%) |
| 34 | attribute | `cotton` | ✅ PASS | Onion Pink Zariwork Tissue Saree; Onion Pink Cotton Printed Anarkali Suit Set; Black & White Kaftan; Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta *(+5 more)* | Onion Pink Cotton Printed Anarkali Suit Set; Kharakapas; Onion Pink Zariwork Tissue Saree; Black & White Kaftan; Blue Printed Straight Shirt *(+5 more)* | recall 10/10 (100%) |
| 35 | attribute | `Sharara` | ✅ PASS | Onion Pink Cotton Printed Anarkali Suit Set | Onion Pink Cotton Printed Anarkali Suit Set | recall 1/1 (100%) |
| 36 | attribute | `Mirror Work` | ✅ PASS | Onion Pink Cotton Printed Anarkali Suit Set; Lookbook Art | Onion Pink Cotton Printed Anarkali Suit Set; Lookbook Art | recall 2/2 (100%) |
| 37 | attribute | `Kurta Set` | ✅ PASS | Onion Pink Cotton Printed Anarkali Suit Set; Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Rajnandii | Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Rajnandii | recall 3/4 (75%) |
| 38 | attribute | `silk` | ✅ PASS | Libas; Elegant Red Silk Saree; RIRASA; Swapnil Lehenga; Aarini Saree *(+4 more)* | Elegant Red Silk Saree; Aarini Saree; Libas; RIRASA; Test Product New Excel Three *(+4 more)* | recall 9/9 (100%) |
| 39 | attribute | `red` | ❌ FAIL | Elegant Red Silk Saree; Blue Chanderi Solid Gathered Suit Set; RIRASA; Ziya Suit Set; Test Product New Excel Two *(+1 more)* | Elegant Red Silk Saree; Tattered Jeans; Blue Chanderi Solid Gathered Suit Set; Mustard Yellow Printed Flared Dress; Onion Pink Zariwork Tissue Saree *(+5 more)* | recall 2/6 (33%); 8 unexpected products returned |
| 40 | attribute | `bridal` | ✅ PASS | Elegant Red Silk Saree; Swapnil Lehenga; Test Product New Excel one; Test-1 Product New Excel one; EXTRA: RIRASA | RIRASA; Swapnil Lehenga; Elegant Red Silk Saree; Test Product New Excel one; Test-1 Product New Excel one | recall 4/4 (100%); 1 unexpected products returned |
| 41 | attribute | `Festive` | ✅ PASS | Elegant Red Silk Saree; Mustard Yellow Printed Flared Dress; Swapnil Lehenga; Ziya Suit Set; Aarini Saree *(+6 more)* | Ziya Suit Set; Elegant Red Silk Saree; Mustard Yellow Printed Flared Dress; Swapnil Lehenga; Aarini Saree *(+6 more)* | recall 11/11 (100%) |
| 42 | attribute | `Wedding` | ✅ PASS | Elegant Red Silk Saree; Swapnil Lehenga; Aarini Saree; Test Product New Excel Three; Test Product New Excel one *(+2 more)* | Elegant Red Silk Saree; Swapnil Lehenga; Aarini Saree; Test Product New Excel Three; Test Product New Excel one *(+2 more)* | recall 7/7 (100%) |
| 43 | attribute | `Traditional` | ✅ PASS | Elegant Red Silk Saree; Aarini Saree; Test Product New Excel Three; Test-3 Product New Excel Three | Elegant Red Silk Saree; Aarini Saree; Test Product New Excel Three; Test-3 Product New Excel Three | recall 4/4 (100%) |
| 44 | attribute | `Zari` | ✅ PASS | Elegant Red Silk Saree; Swapnil Lehenga; Aarini Saree; Test Product New Excel Three; Test Product New Excel one *(+2 more)* | Onion Pink Zariwork Tissue Saree; Elegant Red Silk Saree; Swapnil Lehenga; Aarini Saree; Test Product New Excel Three *(+3 more)* | recall 7/7 (100%); 1 unexpected products returned |
| 45 | attribute | `Embroidery` | ❌ FAIL | Elegant Red Silk Saree; EXTRA: Blue Chanderi Solid Gathered Suit Set; EXTRA: RIRASA; EXTRA: Ziya Suit Set; EXTRA: Test Product New Excel Two | Elegant Red Silk Saree; Blue Chanderi Solid Gathered Suit Set; RIRASA; Ziya Suit Set; Test Product New Excel Two *(+1 more)* | recall 1/1 (100%); 5 unexpected products returned |
| 46 | attribute | `Saree` | ❌ FAIL | Elegant Red Silk Saree; Test Product Name; Aarini Saree; Test Product New Excel Three; Test-3 Product New Excel Three | Onion Pink Zariwork Tissue Saree; Libas; Elegant Red Silk Saree; Aarini Saree | recall 2/5 (40%); 2 unexpected products returned |
| 47 | attribute | `premium` | ❌ FAIL | Black & White Kaftan; Lookbook Art; Rajnandii; EXTRA: Swapnil Lehenga; EXTRA: Aarini Saree | Black & White Kaftan; Lookbook Art; Rajnandii; Swapnil Lehenga; Aarini Saree *(+7 more)* | recall 3/3 (100%); 9 unexpected products returned |
| 48 | attribute | `Straight Kurta` | ✅ PASS | Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Rajnandii | Navy Blue Floral Printed Straight Kurta; Blue Printed Straight Shirt; Rajnandii | recall 3/3 (100%) |
| 49 | attribute | `Office` | ✅ PASS | Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Mustard Yellow Printed Flared Dress; EXTRA: Blue Chanderi Solid Gathered Suit Set; EXTRA: Onion Pink Zariwork Tissue Saree | Blue Printed Straight Shirt; Blue Chanderi Solid Gathered Suit Set; Onion Pink Zariwork Tissue Saree; Navy Blue Floral Printed Straight Kurta; Mustard Yellow Printed Flared Dress | recall 3/3 (100%); 2 unexpected products returned |
| 50 | attribute | `Kurta Sets` | ✅ PASS | Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Rajnandii | Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Rajnandii | recall 3/3 (100%) |
| 51 | attribute | `chanderi` | ✅ PASS | Blue Chanderi Solid Gathered Suit Set; Ziya Suit Set; Test Product New Excel Two; Test-2 Product New Excel Two | Blue Chanderi Solid Gathered Suit Set; Ziya Suit Set; Test Product New Excel Two; Test-2 Product New Excel Two | recall 4/4 (100%) |
| 52 | attribute | `Straight Cut` | ✅ PASS | Blue Chanderi Solid Gathered Suit Set | Blue Chanderi Solid Gathered Suit Set | recall 1/1 (100%) |
| 53 | attribute | `Embroidered` | ✅ PASS | Blue Chanderi Solid Gathered Suit Set; RIRASA; Ziya Suit Set; Test Product New Excel Two; Test-2 Product New Excel Two | Blue Chanderi Solid Gathered Suit Set; RIRASA; Ziya Suit Set; Test Product New Excel Two; Test-2 Product New Excel Two *(+1 more)* | recall 5/5 (100%); 1 unexpected products returned |
| 54 | attribute | `Anarkali set` | ✅ PASS | Blue Chanderi Solid Gathered Suit Set; EXTRA: Onion Pink Cotton Printed Anarkali Suit Set | Onion Pink Cotton Printed Anarkali Suit Set; Blue Chanderi Solid Gathered Suit Set | recall 1/1 (100%); 1 unexpected products returned |
| 55 | attribute | `dress` | ❌ FAIL | Kharakapas; EXTRA: Elegant Beige Flowy Mini Dress; EXTRA: Mustard Yellow Printed Flared Dress | Elegant Beige Flowy Mini Dress; Mustard Yellow Printed Flared Dress; Kharakapas | recall 1/1 (100%); 2 unexpected products returned |
| 56 | attribute | `long dress` | ✅ PASS | Kharakapas | Kharakapas | recall 1/1 (100%) |
| 57 | attribute | `long` | ❌ FAIL | Kharakapas; EXTRA: Lookbook Art; EXTRA: RIRASA; EXTRA: Swapnil Lehenga | Lookbook Art; RIRASA; Swapnil Lehenga; Kharakapas | recall 1/1 (100%); 3 unexpected products returned |
| 58 | attribute | `Flower` | ❌ FAIL | Kharakapas; EXTRA: Elegant Beige Flowy Mini Dress; EXTRA: Tattered Jeans | Elegant Beige Flowy Mini Dress; Kharakapas; Tattered Jeans | recall 1/1 (100%); 2 unexpected products returned |
| 59 | attribute | `Long Dress` | ✅ PASS | Kharakapas | Kharakapas | recall 1/1 (100%) |
| 60 | attribute | `Premium` | ❌ FAIL | Black & White Kaftan; Lookbook Art; Rajnandii; EXTRA: Swapnil Lehenga; EXTRA: Aarini Saree | Black & White Kaftan; Lookbook Art; Rajnandii; Swapnil Lehenga; Aarini Saree *(+7 more)* | recall 3/3 (100%); 9 unexpected products returned |
| 61 | typo | `soot (→ "suit")` | ✅ PASS | Onion Pink Cotton Printed Anarkali Suit Set; Blue Chanderi Solid Gathered Suit Set; Ziya Suit Set | Onion Pink Cotton Printed Anarkali Suit Set; Blue Chanderi Solid Gathered Suit Set; Ziya Suit Set; Lookbook Art; Test Product New Excel Two *(+1 more)* | At least one "suit" product returned |
| 62 | typo | `shrt (→ "shirt")` | ✅ PASS | Blue Printed Straight Shirt | Blue Printed Straight Shirt; Test Product Name | At least one "shirt" product returned |
| 63 | typo | `lehengaa (→ "lehenga")` | ✅ PASS | Swapnil Lehenga | Lookbook Art; RIRASA; Swapnil Lehenga | At least one "lehenga" product returned |
| 64 | typo | `kurtaa (→ "kurta")` | ✅ PASS | Navy Blue Floral Printed Straight Kurta | Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Rajnandii; Onion Pink Cotton Printed Anarkali Suit Set | At least one "kurta" product returned |
| 65 | typo | `dres (→ "dress")` | ✅ PASS | Elegant Beige Flowy Mini Dress; Mustard Yellow Printed Flared Dress | Elegant Beige Flowy Mini Dress; Mustard Yellow Printed Flared Dress; Kharakapas | At least one "dress" product returned |
| 66 | partial | `cot` | ✅ PASS | — | Onion Pink Cotton Printed Anarkali Suit Set; Kharakapas; Onion Pink Zariwork Tissue Saree; Black & White Kaftan; Blue Printed Straight Shirt *(+5 more)* | 10 results returned |
| 67 | partial | `silk` | ✅ PASS | — | Elegant Red Silk Saree; Aarini Saree; Libas; RIRASA; Test Product New Excel Three *(+4 more)* | 9 results returned |
| 68 | partial | `linen` | ❌ FAIL | — | — | No results for partial query |
| 69 | partial | `party` | ✅ PASS | — | Lookbook Art; Ziya Suit Set; Test Product New Excel Two; Test-2 Product New Excel Two | 4 results returned |
| 70 | partial | `wedding` | ✅ PASS | — | Elegant Red Silk Saree; Swapnil Lehenga; Aarini Saree; Test Product New Excel Three; Test Product New Excel one *(+2 more)* | 7 results returned |
| 71 | partial | `casual` | ✅ PASS | — | Onion Pink Cotton Printed Anarkali Suit Set; Mustard Yellow Printed Flared Dress; Libas; Navy Blue Floral Printed Straight Kurta; Rajnandii *(+1 more)* | 6 results returned |
| 72 | substring | `print` | ✅ PASS | Onion Pink Cotton Printed Anarkali Suit Set; Blue Printed Straight Shirt; Navy Blue Floral Printed Straight Kurta; Mustard Yellow Printed Flared Dress | Blue Printed Straight Shirt; Mustard Yellow Printed Flared Dress; Onion Pink Cotton Printed Anarkali Suit Set; Navy Blue Floral Printed Straight Kurta | 4 products returned (4 expected) |
| 73 | substring | `embroid` | ✅ PASS | — | Elegant Red Silk Saree; Blue Chanderi Solid Gathered Suit Set; RIRASA; Ziya Suit Set; Test Product New Excel Two *(+1 more)* | 6 products returned (0 expected) |
| 74 | substring | `floral` | ✅ PASS | Navy Blue Floral Printed Straight Kurta | Navy Blue Floral Printed Straight Kurta | 1 products returned (1 expected) |
| 75 | substring | `georget` | ✅ PASS | — | — | 0 products returned (0 expected) |
| 76 | substring | `chiffon` | ✅ PASS | — | — | 0 products returned (0 expected) |

## Failed Tests (9)

| Group | Query | Expected | Returned | Reason |
|-------|-------|----------|----------|--------|
| attribute | `red` | Elegant Red Silk Saree, Blue Chanderi Solid Gathered Suit Set, RIRASA, Ziya Suit Set, Test Product New Excel Two *(+1 more)* | Elegant Red Silk Saree, Tattered Jeans, Blue Chanderi Solid Gathered Suit Set, Mustard Yellow Printed Flared Dress, Onion Pink Zariwork Tissue Saree *(+5 more)* | recall 2/6 (33%); 8 unexpected products returned |
| attribute | `Embroidery` | Elegant Red Silk Saree, EXTRA: Blue Chanderi Solid Gathered Suit Set, EXTRA: RIRASA, EXTRA: Ziya Suit Set, EXTRA: Test Product New Excel Two | Elegant Red Silk Saree, Blue Chanderi Solid Gathered Suit Set, RIRASA, Ziya Suit Set, Test Product New Excel Two *(+1 more)* | recall 1/1 (100%); 5 unexpected products returned |
| attribute | `Saree` | Elegant Red Silk Saree, Test Product Name, Aarini Saree, Test Product New Excel Three, Test-3 Product New Excel Three | Onion Pink Zariwork Tissue Saree, Libas, Elegant Red Silk Saree, Aarini Saree | recall 2/5 (40%); 2 unexpected products returned |
| attribute | `premium` | Black & White Kaftan, Lookbook Art, Rajnandii, EXTRA: Swapnil Lehenga, EXTRA: Aarini Saree | Black & White Kaftan, Lookbook Art, Rajnandii, Swapnil Lehenga, Aarini Saree *(+7 more)* | recall 3/3 (100%); 9 unexpected products returned |
| attribute | `dress` | Kharakapas, EXTRA: Elegant Beige Flowy Mini Dress, EXTRA: Mustard Yellow Printed Flared Dress | Elegant Beige Flowy Mini Dress, Mustard Yellow Printed Flared Dress, Kharakapas | recall 1/1 (100%); 2 unexpected products returned |
| attribute | `long` | Kharakapas, EXTRA: Lookbook Art, EXTRA: RIRASA, EXTRA: Swapnil Lehenga | Lookbook Art, RIRASA, Swapnil Lehenga, Kharakapas | recall 1/1 (100%); 3 unexpected products returned |
| attribute | `Flower` | Kharakapas, EXTRA: Elegant Beige Flowy Mini Dress, EXTRA: Tattered Jeans | Elegant Beige Flowy Mini Dress, Kharakapas, Tattered Jeans | recall 1/1 (100%); 2 unexpected products returned |
| attribute | `Premium` | Black & White Kaftan, Lookbook Art, Rajnandii, EXTRA: Swapnil Lehenga, EXTRA: Aarini Saree | Black & White Kaftan, Lookbook Art, Rajnandii, Swapnil Lehenga, Aarini Saree *(+7 more)* | recall 3/3 (100%); 9 unexpected products returned |
| partial | `linen` | — | — | No results for partial query |

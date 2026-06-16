const levenshteinDistance = (a, b) => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: a.length + 1 }, (_, i) => i);

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1,
            );
    }
  }
  return matrix[b.length][a.length];
};

const hasPrefixTypoMatch = (queryWord, categoryWord) => {
  if (!queryWord || !categoryWord) return false;
  if (queryWord.length < 3 || categoryWord.length < 3) return false;

  // For prefix typos, we check if the query word is close to being a prefix of the category word.
  // Examples: "shrt" is a typo for "shirt", and "shirt" is a prefix of "shirts" -> match
  //           "sut" is a typo for "suit", and "suit" could be a prefix of "suits" -> match
  // But "festive" vs "test" - neither is a prefix of the other -> no match

  // Take the longer prefix from categoryWord that we'll compare against
  const categoryPrefix = categoryWord.slice(0, queryWord.length);

  // For this to be a prefix typo, the category word should start with something close to the query
  // OR the query should start with something close to the category
  const queryPrefix = queryWord.slice(0, categoryWord.length);

  // Check: is the query word a typo for a prefix of the category word?
  const queryIsTypoForCategoryPrefix =
    levenshteinDistance(queryWord, categoryPrefix) <= 1;

  // Check: is the category word a prefix typo of the query word?
  const categoryIsTypoForQueryPrefix =
    levenshteinDistance(queryPrefix, categoryWord) <= 1;

  // Additionally, require that the match is "prefix-like": the matching part should be
  // at the beginning of BOTH words, or one word should be significantly shorter
  const hasPrefixRelationship =
    queryWord.length <= categoryWord.length + 1 ||
    categoryWord.length <= queryWord.length + 1;

  return (
    (queryIsTypoForCategoryPrefix || categoryIsTypoForQueryPrefix) &&
    hasPrefixRelationship
  );
};

async function test() {
  // Test hasPrefixTypoMatch
  console.log("Testing hasPrefixTypoMatch:");
  console.log(`  festive vs test: ${hasPrefixTypoMatch("festive", "test")}`);
  console.log(`  festive vs shirt: ${hasPrefixTypoMatch("festive", "shirt")}`);
  console.log(
    `  shrt vs shirts (should be true): ${hasPrefixTypoMatch("shrt", "shirts")}`,
  );
  console.log(
    `  shirt vs shirts (should be true): ${hasPrefixTypoMatch("shirt", "shirts")}`,
  );
  console.log(
    `  sut vs suits (should be true - typo): ${hasPrefixTypoMatch("sut", "suits")}`,
  );
  console.log(
    `  shirt vs suit (should be false): ${hasPrefixTypoMatch("shirt", "suit")}`,
  );
}

test();

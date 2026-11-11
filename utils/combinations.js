export function combinations(...arrays) {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0].map(item => [item]);
  
  const [first, ...rest] = arrays;
  const subCombinations = combinations(...rest);
  
  return first.flatMap(item => 
    subCombinations.map(combination => [item, ...combination])
  );
}
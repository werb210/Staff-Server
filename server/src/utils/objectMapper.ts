export type Mapper<TInput, TOutput> = (input: TInput) => TOutput;

export const mapArray = <TInput, TOutput>(
  items: readonly TInput[],
  mapper: Mapper<TInput, TOutput>,
): TOutput[] => items.map(mapper);

export const pick = <T extends object, K extends keyof T>(
  input: T,
  keys: readonly K[],
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    result[key] = input[key];
  });
  return result;
};

export const mapKeys = <T extends object, TResult extends Record<string, unknown>>(
  input: T,
  mapper: (entry: [key: keyof T, value: T[keyof T]]) => [string, unknown],
): TResult => {
  const entries = Object.entries(input) as [keyof T, T[keyof T]][];
  return entries.reduce((acc, entry) => {
    const [key, value] = mapper(entry);
    return { ...acc, [key]: value } as TResult;
  }, {} as TResult);
};

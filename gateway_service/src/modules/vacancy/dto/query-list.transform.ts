import { TransformFnParams } from 'class-transformer';

export function queryList({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  const values: unknown[] = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => {
    if (typeof item !== 'string') {
      return [item];
    }
    return item.split(',').map((part) => part.trim());
  });
}

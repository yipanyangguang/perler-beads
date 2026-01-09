/**
 * clsx 简单实现 - 条件合并类名
 * 由于移除 tailwindcss，我们提供一个简单的实现来代替第三方包
 */

export function clsx(...args: (string | Record<string, boolean> | undefined | null | false)[]): string {
  return args
    .flatMap(arg => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (!arg || typeof arg !== 'object') {
        return [];
      }
      return Object.entries(arg)
        .filter(([, value]) => value)
        .map(([key]) => key);
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * State returned by a Convex-backed read hook.
 * @template T - Shape of the loaded data
 */
export interface ConvexQueryState<T> {
  data: T | undefined
  error: Error | null
  loading: boolean
}

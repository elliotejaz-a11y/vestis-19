/**
 * SwipeNavigator — plain wrapper div. No swipe/gesture navigation.
 * Tabs change only by tapping bottom nav icons.
 */
export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100%" }}>{children}</div>;
}

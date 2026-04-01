import React from "react";

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100%" }}>
      {children}
    </div>
  );
}

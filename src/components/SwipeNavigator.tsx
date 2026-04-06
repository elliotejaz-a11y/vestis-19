import React from "react";

export function SwipeNavigator({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

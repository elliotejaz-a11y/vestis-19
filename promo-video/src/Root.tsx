import React from "react";
import { Composition } from "remotion";
import { VestisPromo } from "./Composition";

export const Root: React.FC = () => {
  return (
    <Composition
      id="VestisPromo"
      component={VestisPromo}
      durationInFrames={630}
      fps={60}
      width={1080}
      height={1920}
    />
  );
};

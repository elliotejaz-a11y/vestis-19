import React from "react";
import { Composition } from "remotion";
import { VestisPromo } from "./Composition";
import { ExplainerVideo } from "./ExplainerVideo";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="VestisPromo"
        component={VestisPromo}
        durationInFrames={630}
        fps={60}
        width={1080}
        height={1920}
      />
      <Composition
        id="VestisExplainer"
        component={ExplainerVideo}
        durationInFrames={1800}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};

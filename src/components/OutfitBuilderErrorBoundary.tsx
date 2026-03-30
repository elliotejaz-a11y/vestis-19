import React from "react";
import { Button } from "@/components/ui/button";

interface State {
  hasError: boolean;
}

export class OutfitBuilderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Caught error in OutfitBuilder boundary
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-foreground font-semibold">Something went wrong</p>
          <p className="text-sm text-muted-foreground text-center">
            The outfit builder ran into an issue. Tap below to try again.
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

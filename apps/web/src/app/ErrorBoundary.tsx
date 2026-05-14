import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Uncaught error:", error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full min-h-[480px] place-items-center px-6 py-20 text-center">
          <div className="max-w-md">
            <p className="m-0 font-serif text-[120px] italic leading-none tracking-tighter">
              !
            </p>
            <h1 className="mt-2 font-serif text-3xl">Something broke.</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {this.state.error.message}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="ghost" onClick={() => location.reload()}>
                Reload
              </Button>
              <Button onClick={this.reset}>Try again</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

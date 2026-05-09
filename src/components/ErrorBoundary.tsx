import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] uncaught error:", error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-white px-6 text-center text-charcoal dark:bg-black dark:text-white">
        <div className="max-w-md space-y-4">
          <p className="text-4xl">😵</p>
          <h1 className="text-lg font-bold">Something went wrong</h1>
          <p className="text-sm text-charcoal/60 dark:text-zinc-400">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-xl bg-burgundy-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-burgundy-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

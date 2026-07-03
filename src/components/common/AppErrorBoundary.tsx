import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

type AppErrorBoundaryProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  onReset?: () => void;
  resetKey?: string | number;
  title?: string;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary caught an error", error, errorInfo);
  }

  componentDidUpdate(previousProps: AppErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Card className={this.props.className}>
        <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {this.props.title || "This section could not be displayed."}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              {this.props.description ||
                "Something went wrong while rendering this part of the page. You can try again without losing the whole screen."}
            </p>
          </div>
          <Button type="button" onClick={this.handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
}

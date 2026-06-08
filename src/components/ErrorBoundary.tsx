import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="error-fallback" role="alert">
          <h1>Visual Agenda failed to load.</h1>
          {import.meta.env.DEV && <pre>{this.state.error.message}</pre>}
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

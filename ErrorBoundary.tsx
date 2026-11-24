import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected interface error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-[#27272A] bg-[#111114] p-8 text-center">
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-sm text-[#A1A1AA] mb-6">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[#8B5CF6] text-white text-sm font-medium hover:bg-[#7C3AED] transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

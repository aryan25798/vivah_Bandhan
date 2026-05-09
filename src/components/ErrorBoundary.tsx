"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Here you would typically log to Sentry
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ivory flex items-center justify-center p-6 text-center">
          <div className="max-w-md glass p-10 rounded-[2.5rem] border border-rose-gold/20 shadow-2xl">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-royal-black mb-4">Something went wrong</h1>
            <p className="text-royal-black/60 mb-8 leading-relaxed">
              Our royal concierge encountered an unexpected error. We have been notified and are working on it.
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 royal-gradient text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <RefreshCw className="w-5 h-5" />
                Retry Connection
              </button>
              <button 
                onClick={() => window.location.href = "/"}
                className="w-full py-4 glass-light text-royal-black rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Return to Kingdom
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

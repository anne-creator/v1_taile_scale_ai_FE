'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

import { ErrorBlock } from '@/components/blocks/common';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: any): State {
    // Ignore NEXT_NOT_FOUND error to let Next.js handle 404
    if (error.digest === 'NEXT_NOT_FOUND') {
      return { hasError: false };
    }
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    console.log('ErrorBoundary render', this.state);
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorBlock
          title="Something went wrong"
          description="Please try refreshing the page or contact support if the problem persists."
          showLogo
          showBackButton
        />
      );
    }

    return this.props.children;
  }
}

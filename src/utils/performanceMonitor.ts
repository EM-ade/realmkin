/**
 * Performance Monitoring Utility
 * Tracks Core Web Vitals and page performance metrics
 */

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  cls?: number; // Cumulative Layout Shift
  fid?: number; // First Input Delay
  ttfb?: number; // Time to First Byte
  pageLoadTime?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private navigationStart = performance.now();

  /**
   * Initialize performance monitoring
   */
  init(): void {
    if (typeof window === 'undefined') return;

    // Measure page load time
    window.addEventListener('load', () => {
      this.metrics.pageLoadTime = performance.now() - this.navigationStart;
      this.logMetrics();
    });

    // Use PerformanceObserver for Web Vitals
    this.observeWebVitals();
  }

  /**
   * Observe Web Vitals using PerformanceObserver
   */
  private observeWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Observe Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntryWithTiming;
        this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const clsEntry = entry as PerformanceEntryWithValue;
          if (!clsEntry.hadRecentInput && clsEntry.value !== undefined) {
            this.metrics.cls = (this.metrics.cls || 0) + clsEntry.value;
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Observe First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const fidEntry = entries[0] as PerformanceEntryWithDuration;
          this.metrics.fid = fidEntry.processingDuration;
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('PerformanceObserver not supported:', error);
    }
  }

  /**
   * Measure specific operation
   */
  measureOperation(name: string, fn: () => void): number {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Measure async operation
   */
  async measureAsyncOperation<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    return result;
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Log metrics to console
   */
  private logMetrics(): void {
    console.group('📊 Performance Metrics');
    console.log('Page Load Time:', this.metrics.pageLoadTime?.toFixed(2), 'ms');
    console.log('LCP:', this.metrics.lcp?.toFixed(2), 'ms');
    console.log('CLS:', this.metrics.cls?.toFixed(3));
    console.log('FID:', this.metrics.fid?.toFixed(2), 'ms');
    console.groupEnd();
  }

  /**
   * Send metrics to analytics service
   */
  sendToAnalytics(endpoint: string): void {
    if (typeof window === 'undefined') return;

    navigator.sendBeacon(endpoint, JSON.stringify(this.metrics));
  }
}

interface PerformanceEntryWithTiming extends PerformanceEntry {
  renderTime?: number;
  loadTime?: number;
}

interface PerformanceEntryWithValue extends PerformanceEntry {
  hadRecentInput?: boolean;
  value?: number;
}

interface PerformanceEntryWithDuration extends PerformanceEntry {
  processingDuration?: number;
}

export const performanceMonitor = new PerformanceMonitor();

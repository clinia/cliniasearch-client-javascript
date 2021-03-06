import { RetryError, StackFrame } from '..';

export function createRetryError(transporterStackTrace: readonly StackFrame[]): RetryError {
  return {
    name: 'RetryError',
    message:
      'Unreachable hosts - your engine id may be incorrect. If the error persists, contact support@clinia.com.',
    transporterStackTrace,
  };
}

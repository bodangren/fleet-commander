import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { consoleLogError, type LogContext, type ErrorSeverity } from './logger';

describe('consoleLogError', () => {
  const mockContext: LogContext = {
    operation: 'testOperation',
    projectSlug: 'test-project',
    taskKey: 'task-123',
    agentId: 'agent-456',
  };

  let consoleErrorSpy: ReturnType<typeof mock>;
  let consoleWarnSpy: ReturnType<typeof mock>;
  let consoleLogSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    consoleErrorSpy = mock(() => {});
    consoleWarnSpy = mock(() => {});
    consoleLogSpy = mock(() => {});
    console.error = consoleErrorSpy;
    console.warn = consoleWarnSpy;
    console.log = consoleLogSpy;
  });

  test('uses console.error for fatal severity with task context', () => {
    consoleLogError('fatal', 'Critical error', mockContext, new Error('test'));
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const call = consoleErrorSpy.mock.calls[0][0];
    expect(call).toContain('[FATAL]');
    expect(call).toContain('testOperation');
    expect(call).toContain('task=task-123');
    expect(call).toContain('agent=agent-456');
    expect(call).toContain('Critical error');
  });

  test('uses console.warn for warning severity', () => {
    consoleLogError('warning', 'Warning message', mockContext);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const call = consoleWarnSpy.mock.calls[0][0];
    expect(call).toContain('[WARNING]');
    expect(call).toContain('Warning message');
  });

  test('uses console.log for debug severity', () => {
    consoleLogError('debug', 'Debug info', mockContext);
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const call = consoleLogSpy.mock.calls[0][0];
    expect(call).toContain('[DEBUG]');
    expect(call).toContain('Debug info');
  });

  test('handles context without taskKey', () => {
    const contextWithoutTask: LogContext = {
      operation: 'testOp',
    };
    consoleLogError('fatal', 'Error', contextWithoutTask);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const call = consoleErrorSpy.mock.calls[0][0];
    expect(call).toContain('[FATAL]');
    expect(call).not.toContain('task=');
  });

  test('includes error object in output', () => {
    const error = new Error('test error');
    consoleLogError('fatal', 'Error occurred', mockContext, error);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy.mock.calls[0][1]).toBe(error);
  });
});

import { describe, expect, it, mock } from 'bun:test';
import { registerStatsRoutes } from './stats';

describe('registerStatsRoutes', () => {
  const mockClient = {} as any;
  const mockRouter = {
    get: mock(() => {}),
    post: mock(() => {}),
  };

  it('registers all stats routes', () => {
    registerStatsRoutes(mockRouter as any, mockClient);
    expect(mockRouter.get).toHaveBeenCalledTimes(4);
    expect(mockRouter.post).toHaveBeenCalledTimes(1);
  });
});

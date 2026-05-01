const VALID_BRANCH_NAME = /^[a-zA-Z0-9._/-]+$/;

export function validateBranchName(branchName: string): { valid: true } | { valid: false; reason: string } {
  if (!branchName || branchName.length === 0) {
    return { valid: false, reason: 'Branch name is required' };
  }

  if (branchName.startsWith('-')) {
    return { valid: false, reason: 'Branch name cannot start with a hyphen' };
  }

  if (branchName.includes('..')) {
    return { valid: false, reason: 'Branch name cannot contain double dots' };
  }

  if (branchName.endsWith('.')) {
    return { valid: false, reason: 'Branch name cannot end with a dot' };
  }

  if (branchName.includes('//')) {
    return { valid: false, reason: 'Branch name cannot contain double slashes' };
  }

  if (!VALID_BRANCH_NAME.test(branchName)) {
    return {
      valid: false,
      reason: 'Branch name contains invalid characters. Only alphanumeric, dots, underscores, hyphens, and slashes are allowed',
    };
  }

  return { valid: true };
}

export function sanitizeForShell(input: string): string {
  // Remove null bytes and control characters
  return input.replace(/[\x00-\x1f\x7f]/g, '');
}

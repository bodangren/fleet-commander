type AuthProviderConfig = {
  domain: string;
  applicationID: string;
};

type AuthConfig = {
  providers: AuthProviderConfig[];
};

function resolveAuthConfig(): AuthConfig {
  const domain = process.env.CONVEX_AUTH_PROVIDER_DOMAIN;
  const applicationID = process.env.CONVEX_AUTH_APPLICATION_ID;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!domain) {
      throw new Error(
        'CONVEX_AUTH_PROVIDER_DOMAIN must be set when NODE_ENV=production',
      );
    }
    if (!applicationID) {
      throw new Error(
        'CONVEX_AUTH_APPLICATION_ID must be set when NODE_ENV=production',
      );
    }
  }

  return {
    providers: [
      {
        domain: domain ?? 'http://localhost:5173',
        applicationID: applicationID ?? 'fleet-commander',
      },
    ],
  };
}

export default resolveAuthConfig();

export default {
  providers: [
    {
      domain: process.env.CONVEX_AUTH_PROVIDER_DOMAIN ?? 'http://localhost:5173',
      applicationID: process.env.CONVEX_AUTH_APPLICATION_ID ?? 'fleet-commander',
    },
  ],
};

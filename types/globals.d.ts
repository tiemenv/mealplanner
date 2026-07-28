export {};

declare global {
  /** Claims added to the Clerk session token by the dashboard's "Customize
   *  session token" setting: {"metadata": "{{user.public_metadata}}"}. Having
   *  the role in the token is what lets middleware check it without an API
   *  call. See the Creator role section of the README. */
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: "creator";
    };
  }
}

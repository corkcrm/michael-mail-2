import { INVALID_PASSWORD } from "./errors.js"
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import Resend from "@auth/core/providers/resend";
import Apple from "@auth/core/providers/apple";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./otp/ResendOTP";
import { TwilioOTP } from "./otp/TwilioOTP";
import { TwilioVerify } from "./otp/TwilioVerify";
import { ResendOTPPasswordReset } from "./passwordReset/ResendOTPPasswordReset";
import { DataModel } from "./_generated/dataModel.js";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub,
    Google({
      // Add Gmail API scope for reading and modifying emails
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.modify",
          access_type: "offline", // Request refresh token
          prompt: "consent", // Force consent to get refresh token
        },
      },
      // Store the access token in the user profile
      profile(profile, tokens) {
        // Store tokens in the user record for later API calls
        return {
          id: profile.sub, // Google's unique user ID (required by Convex Auth)
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          // Store Google access token for Gmail API calls
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          tokenExpiresAt: tokens.expires_at,
        };
      },
    }),
    Apple({
      clientSecret: process.env.AUTH_APPLE_SECRET!,
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
      profile: undefined,
    }),
    Resend({
      from: process.env.AUTH_EMAIL ?? "My App <onboarding@resend.dev>",
    }),
    ResendOTP,
    TwilioVerify,
    TwilioOTP,
    Password,
    // Sample password auth with a custom parameter provided during sign-up
    // flow and custom password validation requirements (at least six chars
    // with at least one number, upper and lower case chars).
    Password<DataModel>({
      id: "password-custom",
      profile(params, _ctx) {
        return {
          email: params.email as string,
          favoriteColor: params.favoriteColor as string,
        };
      },
      validatePasswordRequirements: (password: string) => {
        if (
          !password ||
          password.length < 6 ||
          !/\d/.test(password) ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password)
        ) {
          throw new ConvexError(INVALID_PASSWORD);
        }
      },
    }),
    Password({ id: "password-with-reset", reset: ResendOTPPasswordReset }),
    Password({
      id: "password-code",
      reset: ResendOTPPasswordReset,
      verify: ResendOTP,
    }),
    // This one only makes sense with routing, ignore for now:
    Password({ id: "password-link", verify: Resend }),
    Anonymous,
  ],
});

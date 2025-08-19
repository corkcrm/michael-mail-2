import { SignInWithGoogle } from "@/auth/oauth/SignInWithGoogle";

export function SignInFormsShowcase() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-[384px] w-full mx-auto flex flex-col gap-6 text-center px-4">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl tracking-tight">
            Welcome to Michael Mail
          </h1>
          <p className="text-muted-foreground">
            Sign in with your Google account to continue
          </p>
        </div>
        <SignInWithGoogle />
      </div>
    </div>
  );
}

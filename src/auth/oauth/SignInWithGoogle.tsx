import { useAuthActions } from "@convex-dev/auth/react";
import { GoogleLogo } from "@/components/GoogleLogo";
import { Button } from "@/components/ui/button";

export function SignInWithGoogle() {
  const { signIn } = useAuthActions();
  return (
    <Button
      className="w-full"
      variant="outline"
      type="button"
      size="lg"
      onClick={() => void signIn("google")}
    >
      <GoogleLogo className="mr-2 h-5 w-5" /> Sign in with Google
    </Button>
  );
}

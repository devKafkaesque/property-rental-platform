import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  useWaveAnimation,
  useFormFieldAnimation,
  useSuccessAnimation,
  useLoadingAnimation,
  useErrorShakeAnimation
} from "@/lib/auth-animations";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs for animations
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  
  // Initialize animations
  useWaveAnimation(containerRef);
  useFormFieldAnimation(formRef);
  const triggerSuccess = useSuccessAnimation(cardRef);
  useLoadingAnimation(spinnerRef);
  const triggerError = useErrorShakeAnimation(cardRef);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        triggerSuccess();
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
        setTimeout(() => setLocation("/"), 1000);
      } else {
        const error = await response.json();
        triggerError();
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message || "Please check your credentials and try again.",
        });
      }
    } catch (error) {
      triggerError();
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-primary-muted via-background to-primary/5"
    >
      {/* Animated background waves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`wave absolute inset-0 opacity-${30 - i * 10} bg-primary/5 rounded-full blur-xl`}
            style={{
              transform: `scale(${1 + i * 0.2})`,
            }}
          />
        ))}
      </div>

      <Card
        ref={cardRef}
        className="w-full max-w-md relative backdrop-blur-sm bg-background/80 border-primary/20"
      >
        <CardHeader>
          <CardTitle className="text-2xl text-center text-primary">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>

        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="form-field space-y-2">
              <Input
                placeholder="Username"
                {...form.register("username")}
                className="bg-background/50"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="form-field space-y-2">
              <Input
                type="password"
                placeholder="Password"
                {...form.register("password")}
                className="bg-background/50"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full relative overflow-hidden group"
              disabled={isLoading}
            >
              {isLoading ? (
                <div ref={spinnerRef} className="flex gap-1 items-center">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="loading-dot w-2 h-2 rounded-full bg-primary-foreground"
                    />
                  ))}
                </div>
              ) : (
                "Sign In"
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-muted via-primary to-primary-muted opacity-0 group-hover:opacity-20 transition-opacity" />
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-primary hover:text-primary-hover"
                onClick={() => setLocation("/signup")}
              >
                Sign up
              </Button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

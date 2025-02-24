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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  useWaveAnimation,
  useFormFieldAnimation,
  useSuccessAnimation,
  useLoadingAnimation,
  useErrorShakeAnimation
} from "@/lib/auth-animations";

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["tenant", "landowner"], {
    required_error: "Please select a role",
  }),
});

export default function SignupPage() {
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
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      password: "",
      role: undefined,
    },
  });

  const onSubmit = async (data: z.infer<typeof signupSchema>) => {
    try {
      setIsLoading(true);
      const response = await apiRequest("/api/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        triggerSuccess();
        toast({
          title: "Account created!",
          description: "Welcome to our property rental platform.",
        });
        setTimeout(() => setLocation("/"), 1000);
      } else {
        const error = await response.json();
        triggerError();
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: error.message || "Please try again with different credentials.",
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
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-tl from-primary/5 via-background to-primary-muted"
    >
      {/* Animated geometric shapes in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`absolute opacity-${20 - i * 4} bg-primary/10`}
            style={{
              clipPath: `polygon(${Math.random() * 100}% ${Math.random() * 100}%, ${Math.random() * 100}% ${Math.random() * 100}%, ${Math.random() * 100}% ${Math.random() * 100}%)`,
              width: `${Math.random() * 400 + 200}px`,
              height: `${Math.random() * 400 + 200}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      <Card
        ref={cardRef}
        className="w-full max-w-md relative backdrop-blur-sm bg-background/80 border-primary/20"
      >
        <CardHeader>
          <CardTitle className="text-2xl text-center text-primary">Create Account</CardTitle>
          <CardDescription className="text-center">
            Join our property rental platform today
          </CardDescription>
        </CardHeader>

        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="form-field space-y-2">
              <Input
                placeholder="Choose a username"
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
                placeholder="Create a password"
                {...form.register("password")}
                className="bg-background/50"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="form-field space-y-2">
              <Select onValueChange={(value) => form.setValue("role", value as "tenant" | "landowner")}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">I'm looking to rent (Tenant)</SelectItem>
                  <SelectItem value="landowner">I'm renting out property (Landowner)</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.role.message}
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
                "Sign Up"
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-muted via-primary to-primary-muted opacity-0 group-hover:opacity-20 transition-opacity" />
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-primary hover:text-primary-hover"
                onClick={() => setLocation("/login")}
              >
                Sign in
              </Button>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Success animation particles container */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

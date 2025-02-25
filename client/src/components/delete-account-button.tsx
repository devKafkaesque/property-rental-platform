import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Trash2 } from "lucide-react";

export default function DeleteAccountButton() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      });
      // Clear any stored auth data
      localStorage.clear();
      // Redirect to home page
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please ensure you have no active rentals.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = () => {
    if (window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone. " +
      "Please ensure you have no active rentals or properties before proceeding."
    )) {
      deleteAccountMutation.mutate();
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleDeleteAccount}
      disabled={deleteAccountMutation.isPending}
      className="w-full"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete Account
    </Button>
  );
}

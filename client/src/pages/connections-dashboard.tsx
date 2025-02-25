import { useQuery, useMutation } from "@tanstack/react-query";
import { Property, TenantContract } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import MaintenanceRequestForm from "@/components/maintenance-request-form";
import MaintenanceRequestList from "@/components/maintenance-request-list";
import {
  Building2, Home, Hotel, Castle, Loader2, Key, RefreshCw,
  Users, LinkIcon, CheckCircle2, XCircle, ArrowLeft, WrenchIcon,
  ClipboardList, ChevronDown, ChevronUp, Wallet, Star,
  AlertCircle, CheckCircle, UserX, History, Clock
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState } from "react";

function getPropertyIcon(type: Property["type"], category: Property["category"]) {
  if (category === "luxury") return Castle;
  if (type === "apartment") return Building2;
  if (type === "villa") return Hotel;
  return Home;
}

export default function ConnectionsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [expandedProperties, setExpandedProperties] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<string>("current");
  const [disconnectDialog, setDisconnectDialog] = useState<{
    isOpen: boolean;
    propertyId?: number;
    contractId?: number;
    tenantId?: number;
  }>({ isOpen: false });
  const [disconnectReason, setDisconnectReason] = useState("");
  const [disconnectType, setDisconnectType] = useState<
    "contract_ended" | "tenant_request" | "violation" | "other"
  >("contract_ended");

  const togglePropertyExpand = (propertyId: number) => {
    setExpandedProperties((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  // For landowners: fetch their properties
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: [user?.role === "landowner" ? `/api/properties/owner/${user?.id}` : "/api/properties"],
    enabled: !!user,
  });

  // For landowners: fetch all tenant contracts with tenant details
  const { data: tenantContracts, isLoading: contractsLoading } = useQuery<TenantContract[]>({
    queryKey: ["/api/tenant-contracts/landowner"],
    enabled: !!user && user.role === "landowner",
  });

  // Modified disconnect mutation for landowners
  const disconnectTenantMutation = useMutation({
    mutationFn: async (data: {
      propertyId: number;
      contractId: number;
      reason: string;
      type: string;
    }) => {
      await apiRequest("POST", `/api/properties/${data.propertyId}/disconnect-tenant`, {
        contractId: data.contractId,
        reason: data.reason,
        type: data.type
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-contracts/landowner"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Tenant has been disconnected from the property.",
      });
      setDisconnectDialog({ isOpen: false });
      setDisconnectReason("");
      setDisconnectType("contract_ended");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect tenant",
        variant: "destructive",
      });
    },
  });

  if (propertiesLoading || contractsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6">Property Connections</h1>

        {user?.role === "landowner" && properties && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Properties</h2>
              <Tabs defaultValue="current" className="w-[400px]" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="current">Current</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {properties.map((property) => {
                const PropertyIcon = getPropertyIcon(property.type, property.category);
                const allContracts = tenantContracts?.filter(
                  (contract) => contract.propertyId === property.id
                ) || [];
                const activeContracts = allContracts.filter(
                  (contract) => contract.contractStatus === "active"
                );
                const historicalContracts = allContracts.filter(
                  (contract) => contract.contractStatus !== "active"
                );
                const isExpanded = expandedProperties.includes(property.id);
                const contractsToShow = activeTab === "current" ? activeContracts : historicalContracts;

                return (
                  <Card key={property.id}>
                    <div
                      className="p-6 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => togglePropertyExpand(property.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <PropertyIcon className="h-5 w-5" />
                          <h3 className="text-lg font-semibold">{property.name}</h3>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`
                            px-2 py-1 rounded-full text-sm
                            ${property.status === "available" ? "bg-green-100 text-green-800" :
                              property.status === "rented" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"}
                          `}>
                            {property.status}
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <CardContent>
                        {contractsToShow.length > 0 ? (
                          contractsToShow.map((contract) => (
                            <div key={contract.id} className="border rounded-lg p-4 mt-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">Tenant ID: {contract.tenantId}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Connected since {new Date(contract.startDate).toLocaleDateString()}
                                  </p>
                                </div>
                                {contract.contractStatus === "active" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDisconnectDialog({
                                      isOpen: true,
                                      propertyId: property.id,
                                      contractId: contract.id,
                                      tenantId: contract.tenantId
                                    })}
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Disconnect Tenant
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            {activeTab === "current" ? "No current tenants" : "No historical records"}
                          </p>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Disconnect Dialog */}
        <Dialog open={disconnectDialog.isOpen} onOpenChange={(open) => setDisconnectDialog({ isOpen: open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disconnect Tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for Disconnection</label>
                <Select
                  value={disconnectType}
                  onValueChange={(value: any) => setDisconnectType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract_ended">Contract Ended</SelectItem>
                    <SelectItem value="tenant_request">Tenant Request</SelectItem>
                    <SelectItem value="violation">Contract Violation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Details</label>
                <Textarea
                  value={disconnectReason}
                  onChange={(e) => setDisconnectReason(e.target.value)}
                  placeholder="Please provide additional details about the disconnection..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDisconnectDialog({ isOpen: false })}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (disconnectDialog.propertyId && disconnectDialog.contractId) {
                      disconnectTenantMutation.mutate({
                        propertyId: disconnectDialog.propertyId,
                        contractId: disconnectDialog.contractId,
                        reason: disconnectReason,
                        type: disconnectType,
                      });
                    }
                  }}
                  disabled={!disconnectReason.trim() || disconnectTenantMutation.isPending}
                >
                  {disconnectTenantMutation.isPending ? "Disconnecting..." : "Confirm Disconnection"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
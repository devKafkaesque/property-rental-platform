import { useQuery, useMutation } from "@tanstack/react-query";
import { Property, TenantContract } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // For tenants: fetch their contracts
  const { data: myContracts, isLoading: myContractsLoading } = useQuery<TenantContract[]>({
    queryKey: ["/api/tenant-contracts/tenant"],
    enabled: !!user && user.role === "tenant",
  });

  // Request deposit return mutation
  const requestDepositMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("POST", `/api/properties/${propertyId}/request-deposit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-contracts/tenant"] });
      toast({
        title: "Success",
        description: "Deposit return request has been submitted.",
      });
    },
  });

  // Handle deposit return mutation (for landlords)
  const handleDepositMutation = useMutation({
    mutationFn: async (data: { propertyId: number; contractId: number; status: "approved" | "rejected" }) => {
      await apiRequest("POST", `/api/properties/${data.propertyId}/handle-deposit`, {
        contractId: data.contractId,
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-contracts/landowner"] });
      toast({
        title: "Success",
        description: "Deposit return request has been handled.",
      });
    },
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
      if (error.message?.includes("deposit return request")) {
        toast({
          title: "Cannot Disconnect",
          description: "Please handle the tenant's deposit return request first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to disconnect tenant",
          variant: "destructive",
        });
      }
    },
  });

  // Tenant self-disconnect mutation
  const disconnectSelfMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("POST", `/api/properties/${propertyId}/disconnect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant-contracts/tenant"] });
      toast({
        title: "Success",
        description: "Successfully disconnected from property.",
      });
    },
  });

  if (propertiesLoading || contractsLoading || myContractsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const renderContractHistory = (contract: TenantContract) => (
    <div key={contract.id} className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Tenant ID: {contract.tenantId}</p>
          <p className="text-sm text-muted-foreground">
            {contract.contractStatus === "active" ? (
              <>Connected since {new Date(contract.startDate).toLocaleDateString()}</>
            ) : (
              <>
                {new Date(contract.startDate).toLocaleDateString()} - {" "}
                {contract.terminatedAt ? new Date(contract.terminatedAt).toLocaleDateString() : "Present"}
              </>
            )}
          </p>
          {contract.terminationReason && (
            <p className="text-sm text-muted-foreground">
              Termination Reason: {contract.terminationReason} ({contract.terminationType})
            </p>
          )}
        </div>
        <span className={`
          px-2 py-1 rounded-full text-sm
          ${contract.contractStatus === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
        `}>
          {contract.contractStatus}
        </span>
      </div>

      <div className="mt-2 text-sm">
        <p className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Deposit History: {
            contract.depositRequested
              ? `Return ${contract.depositReturnStatus}`
              : contract.depositPaid
                ? "Paid"
                : "Not Paid"
          }
        </p>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center space-x-2 mb-2">
          <WrenchIcon className="h-4 w-4" />
          <h3 className="font-medium">Maintenance History</h3>
        </div>
        <MaintenanceRequestList propertyId={contract.propertyId} />
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center space-x-2 mb-2">
          <Star className="h-4 w-4" />
          <h3 className="font-medium">Tenant Record</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Contract Status: {contract.contractStatus}</p>
          <p>Rent Amount: ${contract.rentAmount}</p>
          <p>Payment History: {contract.contractStatus === "active" ? "Up to date" : "Completed"}</p>
        </div>
      </div>
    </div>
  );

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

        {user?.role === "landowner" && (
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
              {properties?.map((property) => {
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
                  <Card key={property.id} className="overflow-hidden">
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => togglePropertyExpand(property.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <PropertyIcon className="h-5 w-5" />
                          <CardTitle className="text-lg">{property.name}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <span className={`
                              px-2 py-1 rounded-full text-sm
                              ${property.status === "available" ? "bg-green-100 text-green-800" :
                                property.status === "rented" ? "bg-blue-100 text-blue-800" :
                                "bg-gray-100 text-gray-800"}
                            `}>
                              {property.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {activeTab === "history" && (
                              <span className="text-sm text-muted-foreground">
                                {historicalContracts.length} past {historicalContracts.length === 1 ? "tenant" : "tenants"}
                              </span>
                            )}
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className={`space-y-4 ${isExpanded ? '' : 'hidden'}`}>
                      {contractsToShow.length > 0 ? (
                        contractsToShow.map((contract) => (
                          activeTab === "current" ? (
                            <div key={contract.id} className="border rounded-lg p-4 space-y-4">
                              {renderContractHistory(contract)}
                              {contract.contractStatus === "active" && (
                                <div className="flex justify-end gap-2 mt-4">
                                  {contract.depositRequested && contract.depositReturnStatus === "pending" ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDepositMutation.mutate({
                                          propertyId: property.id,
                                          contractId: contract.id,
                                          status: "approved"
                                        })}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve Deposit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDepositMutation.mutate({
                                          propertyId: property.id,
                                          contractId: contract.id,
                                          status: "rejected"
                                        })}
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject Deposit
                                      </Button>
                                    </>
                                  ) : (
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
                              )}
                            </div>
                          ) : (
                            <div key={contract.id} className="border rounded-lg p-4 space-y-4 bg-muted/10">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Historical Record</span>
                              </div>
                              {renderContractHistory(contract)}
                            </div>
                          )
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-4">
                          {activeTab === "current" ? "No current tenants" : "No historical records"}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {user?.role === "tenant" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Your Connected Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myContracts?.map((contract) => {
                const property = properties?.find(p => p.id === contract.propertyId);
                if (!property) return null;

                const PropertyIcon = getPropertyIcon(property.type, property.category);
                const isActiveConnection = contract.contractStatus === "active";

                return (
                  <Card key={contract.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <PropertyIcon className="h-5 w-5" />
                          <CardTitle className="text-lg">{property.name}</CardTitle>
                        </div>
                        <span className={`
                          px-2 py-1 rounded-full text-sm
                          ${contract.contractStatus === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        `}>
                          {contract.contractStatus}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">{property.address}</p>
                        <div className="flex items-center space-x-2">
                          <LinkIcon className="h-4 w-4" />
                          <span>Connected since {new Date(contract.startDate).toLocaleDateString()}</span>
                        </div>

                        {/* Deposit Status and Actions */}
                        <div className="flex items-center space-x-2">
                          <Wallet className="h-4 w-4" />
                          <span>
                            Deposit Status: {
                              contract.depositRequested
                                ? contract.depositReturnStatus === "pending"
                                  ? "Return Requested"
                                  : `Return ${contract.depositReturnStatus}`
                                : contract.depositPaid
                                  ? "Paid"
                                  : "Not Paid"
                            }
                          </span>
                        </div>

                        {contract.contractStatus === "active" && !contract.depositRequested && (
                          <Button
                            variant="outline"
                            className="w-full mt-4 flex items-center justify-center gap-2"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to request your deposit return? This action cannot be undone.")) {
                                requestDepositMutation.mutate(property.id);
                              }
                            }}
                          >
                            <Wallet className="h-4 w-4" />
                            Request Deposit Return
                          </Button>
                        )}

                        {contract.contractStatus === "active" && (
                          <Button
                            variant="outline"
                            className="w-full mt-4 flex items-center justify-center gap-2"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to disconnect from this property?")) {
                                disconnectSelfMutation.mutate(property.id);
                              }
                            }}
                          >
                            <UserX className="h-4 w-4" />
                            Disconnect from Property
                          </Button>
                        )}

                        {/* Maintenance History Section */}
                        <div className="border-t pt-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <WrenchIcon className="h-4 w-4" />
                            <h3 className="font-medium">Maintenance Requests</h3>
                          </div>
                          {contract.contractStatus === "active" && (
                            <MaintenanceRequestForm propertyId={property.id} />
                          )}
                          <div className="mt-4">
                            <div className="flex items-center space-x-2 mb-2">
                              <ClipboardList className="h-4 w-4" />
                              <h3 className="font-medium">Request History</h3>
                            </div>
                            <MaintenanceRequestList propertyId={property.id} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Disconnect Dialog for Landowners */}
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
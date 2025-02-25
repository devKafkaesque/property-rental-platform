import { useQuery, useMutation } from "@tanstack/react-query";
import { Property, TenantContract } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MaintenanceRequestForm from "@/components/maintenance-request-form";
import MaintenanceRequestList from "@/components/maintenance-request-list";
import {
  Building2,
  Home,
  Hotel,
  Castle,
  Loader2,
  Key,
  RefreshCw,
  Users,
  LinkIcon,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  WrenchIcon,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Wallet,
  Star
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

  // Generate new connection code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/connection-code`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/owner/${user?.id}`] });
      toast({
        title: "Connection Code Generated",
        description: `New code: ${data.connectionCode}`,
      });
    },
  });

  const togglePropertyExpand = (propertyId: number) => {
    setExpandedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  if (propertiesLoading || contractsLoading || myContractsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-6">Property Connections</h1>

        {user?.role === "landowner" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Your Properties</h2>
            <div className="grid grid-cols-1 gap-6">
              {properties?.map((property) => {
                const PropertyIcon = getPropertyIcon(property.type, property.category);
                const connectedTenants = tenantContracts?.filter(
                  (contract) => contract.propertyId === property.id
                );
                const isExpanded = expandedProperties.includes(property.id);

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
                    </CardHeader>

                    <CardContent className={`space-y-4 ${isExpanded ? '' : 'hidden'}`}>
                      {property.status === "available" && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Key className="h-4 w-4" />
                            <span>{property.connectionCode || "No active code"}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateCodeMutation.mutate(property.id)}
                            disabled={generateCodeMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Generate Code
                          </Button>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4" />
                          <span>
                            {connectedTenants?.length || 0} Connected Tenant{connectedTenants?.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {connectedTenants?.map((contract) => (
                          <div key={contract.id} className="border rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Tenant ID: {contract.tenantId}</p>
                                <p className="text-sm text-muted-foreground">
                                  Connected since {new Date(contract.startDate).toLocaleDateString()}
                                </p>
                              </div>
                              <span className={`
                                px-2 py-1 rounded-full text-sm
                                ${contract.contractStatus === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                              `}>
                                {contract.contractStatus}
                              </span>
                            </div>

                            {/* Maintenance History Section */}
                            <div className="border-t pt-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <WrenchIcon className="h-4 w-4" />
                                <h3 className="font-medium">Maintenance History</h3>
                              </div>
                              <MaintenanceRequestList propertyId={property.id} />
                            </div>

                            {/* Rent Payment History Section */}
                            <div className="border-t pt-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <Wallet className="h-4 w-4" />
                                <h3 className="font-medium">Rent Payment History</h3>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Rent Amount: ${contract.rentAmount}
                                <br />
                                Deposit Status: {contract.depositPaid ? 'Paid' : 'Pending'}
                              </div>
                            </div>

                            {/* Behavior History Section */}
                            <div className="border-t pt-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <Star className="h-4 w-4" />
                                <h3 className="font-medium">Tenant Behavior</h3>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Contract Status: {contract.contractStatus}
                                <br />
                                Payment History: Good Standing
                                <br />
                                Maintenance Request Response: Timely
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
                        <div className="flex items-center space-x-2">
                          {contract.depositPaid ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>Deposit paid</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span>Deposit pending</span>
                            </>
                          )}
                        </div>

                        {isActiveConnection && (
                          <div className="space-y-4 mt-6">
                            <div className="flex items-center space-x-2">
                              <WrenchIcon className="h-4 w-4" />
                              <h3 className="font-medium">Maintenance Requests</h3>
                            </div>
                            <MaintenanceRequestForm propertyId={property.id} />
                            <div className="mt-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <ClipboardList className="h-4 w-4" />
                                <h3 className="font-medium">Request History</h3>
                              </div>
                              <MaintenanceRequestList propertyId={property.id} />
                            </div>
                          </div>
                        )}

                        <Button
                          className="w-full mt-4"
                          variant="outline"
                          onClick={() => setLocation(`/property/${property.id}`)}
                        >
                          View Property Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { IStorage } from "../storage";
import { User, Property, Booking, ViewingRequest, Review, InsertUser, TenantContract, MaintenanceRequest } from "@shared/schema";
import { UserModel, PropertyModel, BookingModel, ViewingRequestModel, ReviewModel, TenantContractModel, MaintenanceRequestModel } from "../db/models";
import session from "express-session";
import MongoStore from "connect-mongo";

export class MongoStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/keyper",
      collectionName: "sessions",
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const user = await UserModel.findOne({ id });
    return user ? user.toObject() : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ username });
    return user ? user.toObject() : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email });
    return user ? user.toObject() : undefined;
  }

  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined> {
    const user = await UserModel.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
    });
    return user ? user.toObject() : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const lastUser = await UserModel.findOne().sort({ id: -1 });
    const newId = (lastUser?.id || 0) + 1;

    const newUser = new UserModel({
      ...user,
      id: newId,
    });
    await newUser.save();
    return newUser.toObject();
  }

  async deleteUser(id: number): Promise<void> {
    try {
      await UserModel.deleteOne({ id });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Property operations
  async createProperty(property: Omit<Property, "id" | "createdAt">): Promise<Property> {
    const lastProperty = await PropertyModel.findOne().sort({ id: -1 });
    const newId = (lastProperty?.id || 0) + 1;

    const newProperty = new PropertyModel({
      ...property,
      id: newId,
    });
    await newProperty.save();
    return newProperty.toObject();
  }

  async getProperties(): Promise<Property[]> {
    const properties = await PropertyModel.find();
    return properties.map(prop => prop.toObject());
  }

  async getPropertyById(id: number): Promise<Property | undefined> {
    if (isNaN(id)) return undefined;
    const property = await PropertyModel.findOne({ id });
    return property ? property.toObject() : undefined;
  }

  async getPropertiesByOwner(ownerId: number): Promise<Property[]> {
    try {
      // Validate and normalize owner ID type
      const ownerIdNum = Number(ownerId);
      if (isNaN(ownerIdNum)) {
        console.log('Invalid ownerId:', { input: ownerId, type: typeof ownerId });
        return [];
      }

      console.log('Querying properties with owner ID:', ownerIdNum);

      const properties = await PropertyModel.find({ 
        ownerId: ownerIdNum 
      }).lean();

      console.log(`Found ${properties.length} properties for owner ${ownerIdNum}:`, 
        properties.map(p => ({ id: p.id, name: p.name }))
      );

      return properties;
    } catch (error) {
      console.error('Error in getPropertiesByOwner:', error);
      throw error;
    }
  }

  async updateProperty(id: number, updates: Partial<Property>): Promise<Property> {
    const property = await PropertyModel.findOneAndUpdate(
      { id },
      { $set: updates },
      { new: true }
    );
    if (!property) throw new Error("Property not found");
    return property.toObject();
  }

  async updatePropertyConnectionCode(id: number, connectionCode: string): Promise<Property> {
    const property = await PropertyModel.findOneAndUpdate(
      { id },
      { $set: { connectionCode } },
      { new: true }
    );
    if (!property) throw new Error("Property not found");
    return property.toObject();
  }

  async deleteProperty(id: number): Promise<void> {
    try {
      await PropertyModel.deleteOne({ id });
    } catch (error) {
      console.error('Error deleting property:', error);
      throw new Error('Failed to delete property');
    }
  }

  // Booking operations
  async createBooking(booking: Omit<Booking, "id" | "createdAt" | "status">): Promise<Booking> {
    const lastBooking = await BookingModel.findOne().sort({ id: -1 });
    const newId = (lastBooking?.id || 0) + 1;

    const newBooking = new BookingModel({
      ...booking,
      id: newId,
      status: "pending"
    });
    await newBooking.save();
    return newBooking.toObject();
  }

  async getBookingsByTenant(tenantId: number): Promise<Booking[]> {
    const bookings = await BookingModel.find({ tenantId });
    return bookings.map(booking => booking.toObject());
  }

  async getBookingsByProperty(propertyId: number): Promise<Booking[]> {
    const bookings = await BookingModel.find({ propertyId });
    return bookings.map(booking => booking.toObject());
  }

  async updateBookingStatus(id: number, status: Booking["status"]): Promise<Booking> {
    const booking = await BookingModel.findOneAndUpdate(
      { id },
      { $set: { status } },
      { new: true }
    );
    if (!booking) throw new Error("Booking not found");
    return booking.toObject();
  }

  // Add Viewing Request operations
  async createViewingRequest(request: Omit<ViewingRequest, "id" | "createdAt" | "status">): Promise<ViewingRequest> {
    const lastRequest = await ViewingRequestModel.findOne().sort({ id: -1 });
    const newId = (lastRequest?.id || 0) + 1;

    const newRequest = new ViewingRequestModel({
      ...request,
      id: newId,
      status: "pending"
    });
    await newRequest.save();
    return newRequest.toObject();
  }

  async getViewingRequestsByProperty(propertyId: number): Promise<ViewingRequest[]> {
    const requests = await ViewingRequestModel.find({ propertyId });
    return requests.map(request => request.toObject());
  }

  async getViewingRequestsByTenant(tenantId: number): Promise<ViewingRequest[]> {
    console.log(`Fetching viewing requests for tenant ID: ${tenantId}`);
    const requests = await ViewingRequestModel.find({ tenantId });
    console.log(`Found ${requests.length} requests for tenant ${tenantId}`);
    return requests.map(request => request.toObject());
  }

  async updateViewingStatus(id: number, status: ViewingRequest["status"]): Promise<ViewingRequest> {
    const request = await ViewingRequestModel.findOneAndUpdate(
      { id },
      { $set: { status } },
      { new: true }
    );
    if (!request) throw new Error("Viewing request not found");
    return request.toObject();
  }

  async getCompletedViewings(tenantId: number, propertyId: number): Promise<ViewingRequest[]> {
    const completedViewings = await ViewingRequestModel.find({
      tenantId,
      propertyId,
      status: "completed"
    });
    return completedViewings.map(viewing => viewing.toObject());
  }

  async getViewingRequestsByTenantAndProperty(tenantId: number, propertyId: number): Promise<ViewingRequest[]> {
    console.log(`Fetching viewing requests for tenant ID: ${tenantId} and property ID: ${propertyId}`);
    const requests = await ViewingRequestModel.find({
      tenantId,
      propertyId
    });
    console.log(`Found ${requests.length} requests for tenant ${tenantId} and property ${propertyId}`);
    return requests.map(request => request.toObject());
  }

  // Add Review operations
  async createReview(review: Omit<Review, "id" | "createdAt" | "status">): Promise<Review> {
    const lastReview = await ReviewModel.findOne().sort({ id: -1 });
    const newId = (lastReview?.id || 0) + 1;

    const newReview = new ReviewModel({
      ...review,
      id: newId,
      status: "pending"
    });
    await newReview.save();
    return newReview.toObject();
  }

  async getReviewsByProperty(propertyId: number): Promise<Review[]> {
    const reviews = await ReviewModel.find({ propertyId });
    return reviews.map(review => review.toObject());
  }

  async getReviewsByTenant(tenantId: number): Promise<Review[]> {
    const reviews = await ReviewModel.find({ tenantId });
    return reviews.map(review => review.toObject());
  }

  async updateReviewStatus(id: number, status: Review["status"]): Promise<Review> {
    const review = await ReviewModel.findOneAndUpdate(
      { id },
      { $set: { status } },
      { new: true }
    );
    if (!review) throw new Error("Review not found");
    return review.toObject();
  }

  // Add Tenant Contract operations
  async createTenantContract(contract: Omit<TenantContract, "id" | "createdAt">): Promise<TenantContract> {
    const lastContract = await TenantContractModel.findOne().sort({ id: -1 });
    const newId = (lastContract?.id || 0) + 1;

    const newContract = new TenantContractModel({
      ...contract,
      id: newId,
    });
    await newContract.save();
    return newContract.toObject();
  }

  async getTenantContractById(id: number): Promise<TenantContract> {
    const contract = await TenantContractModel.findOne({ id });
    if (!contract) throw new Error("Tenant contract not found");
    return contract.toObject();
  }

  async getTenantContractsByProperty(propertyId: number): Promise<TenantContract[]> {
    const contracts = await TenantContractModel.find({ propertyId });
    return contracts.map(contract => contract.toObject());
  }

  async getTenantContractsByTenant(tenantId: number): Promise<TenantContract[]> {
    const contracts = await TenantContractModel.find({ tenantId });
    return contracts.map(contract => contract.toObject());
  }

  async getTenantContractsByLandowner(landownerId: number): Promise<TenantContract[]> {
    const contracts = await TenantContractModel.find({ landownerId });
    return contracts.map(contract => contract.toObject());
  }

  async updateTenantContract(id: number, updates: Partial<TenantContract>): Promise<TenantContract> {
    const contract = await TenantContractModel.findOneAndUpdate(
      { id },
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        } 
      },
      { new: true }
    );
    if (!contract) throw new Error("Tenant contract not found");
    return contract.toObject();
  }

  // Add Maintenance Request operations
  async createMaintenanceRequest(request: Omit<MaintenanceRequest, "id" | "createdAt" | "status">): Promise<MaintenanceRequest> {
    const lastRequest = await MaintenanceRequestModel.findOne().sort({ id: -1 });
    const newId = (lastRequest?.id || 0) + 1;

    const newRequest = new MaintenanceRequestModel({
      ...request,
      id: newId,
      status: "pending",
    });
    await newRequest.save();
    return newRequest.toObject();
  }

  async getMaintenanceRequestById(id: number): Promise<MaintenanceRequest> {
    const request = await MaintenanceRequestModel.findOne({ id });
    if (!request) throw new Error("Maintenance request not found");
    return request.toObject();
  }

  async updateMaintenanceRequest(id: number, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
    const request = await MaintenanceRequestModel.findOneAndUpdate(
      { id },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    if (!request) throw new Error("Maintenance request not found");
    return request.toObject();
  }

  async getMaintenanceRequestsByProperty(propertyId: number): Promise<MaintenanceRequest[]> {
    const requests = await MaintenanceRequestModel.find({ propertyId });
    return requests.map(request => request.toObject());
  }

  async getMaintenanceRequestsByTenant(tenantId: number): Promise<MaintenanceRequest[]> {
    const requests = await MaintenanceRequestModel.find({ tenantId });
    return requests.map(request => request.toObject());
  }

  async updateMaintenanceStatus(id: number, status: MaintenanceRequest["status"]): Promise<MaintenanceRequest> {
    const request = await MaintenanceRequestModel.findOneAndUpdate(
      { id },
      {
        $set: {
          status,
          updatedAt: new Date(),
          ...(status === "completed" ? { completedAt: new Date() } : {})
        }
      },
      { new: true }
    );
    if (!request) throw new Error("Maintenance request not found");
    return request.toObject();
  }

  async updateMaintenanceNotes(id: number, notes: string): Promise<MaintenanceRequest> {
    const request = await MaintenanceRequestModel.findOneAndUpdate(
      { id },
      {
        $set: {
          notes,
          updatedAt: new Date()
        }
      },
      { new: true }
    );
    if (!request) throw new Error("Maintenance request not found");
    return request.toObject();
  }
}
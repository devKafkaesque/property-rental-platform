# Keyper

**Keyper** is an advanced property rental platform designed as a personal hobby project by Vishist Parashar. It serves as both a marketplace for property rentals and a tenant management system, offering detailed property listings, AI-powered features, and real-time interaction between landlords and tenants. Deployed at [https://keyper001.onrender.com/](https://keyper001.onrender.com/), Keyper leverages a modern tech stack to deliver a comprehensive rental experience.

- **Version**: 1.0.0
- **Deployment Date**: February 27, 2025
- **Repository**: [https://github.com/devKafkaesque/property-rental-platform](https://github.com/devKafkaesque/property-rental-platform)
- **Target Commit**: `c81acf199192aee1a1779b378b592eeb0454fe01`

## Purpose
Keyper bridges the gap between landlords and tenants by:
- Providing a marketplace for detailed property listings.
- Offering tenant management tools with real-time communication and request handling.
- Enhancing listings with AI-generated descriptions and cost analysis.

## Technology Stack
- **Frontend**: Vite, React, Tailwind CSS
- **Backend**: Express.js, Node.js, WebSocket (`ws`)
- **Database**: MongoDB
- **AI**: Google Generative AI (`@google/generative-ai`)
- **Hosting**: Render
- **Environment**: Managed with `cross-env`

## Features
Keyper combines marketplace and tenant management functionalities, with distinct dashboards and features for landlords and tenants.

### General Features
#### Property Listings with Detailed Information
- **Description**: Properties include extensive details like number of bathrooms, bedrooms, square footage, and more.
- **Implementation**: Stored in MongoDB with a detailed schema, fetched via Express API.
- **UI**: Rich listing views styled with Tailwind CSS.
- **Access**: Publicly viewable at `/properties`.

#### AI-Generated Descriptions and Cost Analysis
- **Description**: AI generates property descriptions and estimates rental costs based on features.
- **Implementation**: Uses `@google/generative-ai` to process property data and return text/values.
- **UI**: Integrated into property creation/editing forms and listing displays.

#### User Authentication
- **Description**: Separate login for landlords and tenants with role-based access.
- **Implementation**: Passport.js with Local Strategy, MongoDB user collection.
- **UI**: `/auth` route with role selection (tenant/landowner).

#### Responsive Design
- **Description**: Adapts to all device sizes.
- **Implementation**: Tailwind CSS responsive utilities.

### Tenant Features
#### Tenant Dashboard
- **Description**: Personalized dashboard for renters.
- **Access**: `/dashboard` (post-login, tenant role).
- **UI**: Displays saved properties, requests, and chat rooms.

1. **Real-Time Chat**
   - **Description**: Chat with landlords or property habitants in real time.
   - **Implementation**: WebSocket (`ws`) connection via `server/websocket.ts`.
   - **UI**: Chat interface with message history and live updates.

2. **Requesting Property Viewing**
   - **Description**: Tenants request viewings; landlords update status (e.g., approved, denied).
   - **Implementation**: API endpoint (`POST /api/viewings`), status tracked in MongoDB.
   - **UI**: Form on property page, status updates in dashboard.

3. **Booking Requests**
   - **Description**: Submit booking requests for properties.
   - **Implementation**: API endpoint (`POST /api/bookings`), landlord approval workflow.
   - **UI**: Booking form with confirmation status.

4. **Property Connection Management**
   - **Description**: Tenants linked to properties via landlord-generated codes.
   - **Implementation**: Unique codes stored in MongoDB, tied to tenant/property records.
   - **UI**: Dashboard section for linked properties.

5. **Maintenance Requests**
   - **Description**: Post and track maintenance requests for linked properties.
   - **Implementation**: API (`POST /api/maintenance`), status updates by landlord.
   - **UI**: Request form and tracking list.

6. **Deposit Refund Request**
   - **Description**: Request deposit back after a 1-month notice period.
   - **Implementation**: API (`POST /api/deposit-refund`), timed workflow in MongoDB.
   - **UI**: Button on linked property dashboard with status.

7. **Property-Specific Chat Rooms**
   - **Description**: Chat with other tenants in the same property.
   - **Implementation**: WebSocket rooms tied to property codes.
   - **UI**: Group chat interface.

### Landlord Features
#### Landlord Dashboard
- **Description**: Management hub for property owners.
- **Access**: `/dashboard` (post-login, landowner role).
- **UI**: Lists properties, requests, and tenant interactions.

1. **Property Management**
   - **Description**: Add/edit properties with details (bathrooms, bedrooms, square footage, etc.).
   - **Implementation**: CRUD API (`/api/properties`), MongoDB storage.
   - **UI**: Detailed forms with AI-assisted fields.

2. **Real-Time Chat**
   - **Description**: Communicate with tenants instantly.
   - **Implementation**: WebSocket integration.
   - **UI**: Chat interface per tenant/property.

3. **Approving Viewing Requests**
   - **Description**: Review and approve/deny tenant viewing requests.
   - **Implementation**: API (`PUT /api/viewings/:id/status`).
   - **UI**: Request list with action buttons.

4. **Booking Request Handling**
   - **Description**: Manage tenant booking requests.
   - **Implementation**: API (`PUT /api/bookings/:id/status`).
   - **UI**: Approve/reject options in dashboard.

5. **Property Linking**
   - **Description**: Generate codes to link properties to tenants.
   - **Implementation**: Random code generation, stored in MongoDB.
   - **UI**: Code display/copy feature per property.

6. **Tenant Management Dashboard**
   - **Description**: Track linked tenants, maintenance requests, and deposits.
   - **Implementation**: API aggregation (`/api/tenants/property/:code`).
   - **UI**: Detailed view per property with tenant info.

### Marketplace and Tenant Manager Hybrid
- **Description**: Combines rental discovery with post-rental management.
- **Implementation**:
  - **Marketplace**: Public listings at `/properties`.
  - **Tenant Manager**: Code-based linking post-rental, enabling maintenance/chat features.
- **UI**: Seamless transition from browsing to management via dashboards.

## Setup and Deployment

### Prerequisites
- Node.js 22.12.0
- npm
- MongoDB (e.g., Atlas)
- Google Generative AI API key

### Local Setup
1. **Clone Repository**:
   ```bash
   git clone https://github.com/devKafkaesque/property-rental-platform.git
   cd property-rental-platform
   git checkout b74610bc9a6a0b4b701e34e5cb374fb69a5c845c
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
- Create .env in root:
   ```plaintext
   MONGODB_URI=mongodb://[your-mongo-uri]
   PORT=5000
   GOOGLE_AI_KEY=[your-api-key]
   ```
4. **Run Locally**:
   ```bash
   npm run build
   npm run start
   ```
   - Access at http://localhost:5000.
## Deployment on Render
   -Build Command: npm install; npm run build
   -Start Command: npm run start
   -Environment Variables:
      ```plaintext
      NODE_ENV=production
      MONGODB_URI=[your-mongo-uri]
      GOOGLE_AI_KEY=[your-api-key]
      ```
   -URL: https://keyper001.onrender.com/
## Troubleshooting
   -Local Build Error(Unexpected token (38:24)):
      -Check client/src/index.css for syntax errors around line 38 (share full file if needed).
   -Render deploy fails:
      -Ensure NODE_ENV=production in Render settings.
      -Verify MongoDB URI and AI key.
### Future Enhancements
   -Payment Gateway: Rent and deposit transactions.
   -AI Upgrades: Enhanced cost predictions with market data.
   -Mobile App: Native tenant/landlord experience.

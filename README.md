# Property Rental Management Platform

A comprehensive property rental management platform that simplifies interactions between tenants and landowners through intelligent, secure, and user-centric features.

## Features

- React.js frontend with modern UI components
- Node.js/Express backend
- MongoDB database integration
- Google Gemini AI integration for property recommendations and descriptions
- Google OAuth authentication
- Tailwind CSS for responsive design
- Advanced role-based access control
- Real-time tenant viewing request management
- Flexible authentication with username/email login

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **AI Integration**: Google Gemini API
- **Authentication**: Google OAuth, Passport.js
- **State Management**: TanStack Query
- **Routing**: Wouter

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add required environment variables:
     ```
     GOOGLE_API_KEY=your_google_api_key
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared types and utilities
└── uploads/         # File uploads directory
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
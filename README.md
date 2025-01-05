# PantryPal

PantryPal is a modern web application designed to help users manage their grocery shopping, meal planning, and pantry inventory efficiently. Built with React, TypeScript, and Firebase, it offers a seamless experience for organizing your food-related activities.

## Features

### Shopping Lists
- Create and manage multiple shopping lists
- Add items with quantities
- Assign items to specific stores
- Mark items as completed
- Real-time updates across devices

### Meal Planning
- Plan meals for the week
- Create and save favorite meals
- Add ingredients to shopping lists
- Organize meals by date

### Store Management
- Add and manage your favorite stores
- Associate items with specific stores
- Optimize shopping trips

## Tech Stack

- **Frontend:**
  - React 18
  - TypeScript
  - Tailwind CSS
  - Lucide Icons

- **Backend:**
  - Firebase Realtime Database
  - Firebase Authentication

- **Build Tools:**
  - Vite
  - npm

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Firebase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pantrypal.git
   cd pantrypal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Firebase project and set up your configuration:
   - Create a new project in Firebase Console
   - Enable Authentication and Realtime Database
   - Create a web app in your Firebase project
   - Copy the Firebase configuration

4. Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_DATABASE_URL=your_database_url
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/        # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and configurations
├── pages/            # Main application pages
├── types/            # TypeScript type definitions
└── main.tsx          # Application entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

- All sensitive configuration is stored in environment variables
- Firebase Security Rules are implemented to protect user data
- Authentication is required for all data access

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Vite](https://vitejs.dev/)

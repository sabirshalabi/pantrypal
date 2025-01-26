# PantryPal Repository Map

## Project Overview
PantryPal is a progressive web application (PWA) built with React, TypeScript, and Firebase, featuring recipe management, shopping lists, and meal planning capabilities.

## Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend Services**: Firebase, Supabase
- **PWA Support**: Service Worker implementation
- **API Integration**: RESTful endpoints for recipe scraping with Gemini AI
- **LLM Integration**: Google's Gemini 2.0 Flash Exp model for recipe extraction

## Core Components Structure

### 📱 Main App Components
- `App.tsx` - Root component
- `Layout.tsx` - Main layout wrapper

### 🔐 Authentication & Security
- `PrivateRoute.tsx` - Protected route handler
- `Login.tsx` - Authentication page
- `FirebaseContext.tsx` - Firebase auth context provider
- `useAuth.ts` - Authentication hook

### 📋 Recipe Management
- `RecipeList.tsx` - Recipe listing component
- `RecipeDetail.tsx` - Detailed recipe view
- `RecipeImporter.tsx` - Recipe import and generation functionality with AI-powered features
- `recipeService.ts` - Recipe data management

### 🛒 Shopping List Features
- `ShoppingListView.tsx` - Shopping list main view
- `ShoppingListItem.tsx` - Individual list item
- `StoreModal.tsx` - Store management interface
- `ShareListModal.tsx` - List sharing functionality
- `NewListModal.tsx` - New list creation

### 🍽️ Meal Planning
- `MealPlanning.tsx` - Meal planning page
- `MealModal.tsx` - Meal creation/editing
- `MealPlanModal.tsx` - Meal plan management

### 🛠️ Utility Components
- `/components/ui/`
  - `Disclosure.tsx` - Expandable content component
  - `morphing-dialog.tsx` - Animated dialog component
  - `number-input.tsx` - Custom number input

### 📡 Services & Utilities
- `/services/`
  - `groq.ts` - GROQ query handler
  - `imageService.ts` - Image processing
  - `recipeService.ts` - Recipe data management
- `/utils/`
  - `pwaStatus.ts` - PWA status management
  - `timeUtils.ts` - Time/date utilities
  - `urlUtils.ts` - URL handling

### 🔌 API Integration
- `/api/`
  - `scrape-recipe.ts` - Recipe scraping functionality
- `/server/`
  - `index.js` - Server entry point with Gemini LLM integration:
    - Recipe extraction using Gemini 2.0 Flash Exp model
    - JSON-structured output for ingredients and instructions
    - Fallback to traditional scraping methods

### 💾 Database
- `/supabase/migrations/`
  - Database schema migrations

## Data Flow
1. User authentication flows through Firebase (managed by `FirebaseContext` and `useAuth`)
2. Recipe data is managed through `recipeService` with both local and remote storage
3. Shopping lists sync between devices using Firebase/Supabase
4. Meal planning integrates with recipes and shopping lists for a cohesive experience

## PWA Implementation
- Service worker (`public/sw.js`) handles offline functionality
- Manifest (`public/manifest.json`) defines app behavior
- Multi-platform icons in `/public/android`, `/public/ios`, `/public/windows11`

## Configuration Files
- `vite.config.ts` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS settings
- `tsconfig.json` - TypeScript configuration
- `vercel.json` - Vercel deployment settings

## Development Workflow
1. Frontend development in `/src`
2. API endpoints in `/api`
3. Database migrations in `/supabase/migrations`
4. Configuration and build setup in root directory

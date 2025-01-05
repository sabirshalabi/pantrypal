export interface Meal {
  id: string;
  name: string;
  ingredients: Ingredient[];
  createdAt: number;
  updatedAt: number;
  userId: string;
  favorite: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  storeId?: string; // Optional reference to preferred store
}

export interface MealPlan {
  id: string;
  name: string;
  startDate: number; // timestamp
  endDate: number; // timestamp
  meals: DailyMeal[];
  otherItems: OtherItem[]; // For non-meal items like paper towels
  createdAt: number;
  updatedAt: number;
  userId: string;
}

export interface DailyMeal {
  id: string;
  date: number; // timestamp
  mealId: string;
  mealName: string; // Denormalized for convenience
  notes?: string;
}

export interface OtherItem {
  id: string;
  name: string;
  storeId?: string;
  completed: boolean;
}

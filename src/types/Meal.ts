export interface Ingredient {
  id: string;
  name: string;
  storeId?: string;
}

export interface Meal {
  id: string;
  name: string;
  ingredients: Ingredient[];
  favorite: boolean;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface MealPlanItem {
  id: string;
  name: string;
  completed: boolean;
  storeId?: string;
}

export interface DailyMeal {
  id: string;
  date: number;
  mealId?: string;
  mealName?: string;
}

export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: number;
  endDate: number;
  meals: DailyMeal[];
  otherItems?: MealPlanItem[];
  createdAt: number;
  updatedAt: number;
}

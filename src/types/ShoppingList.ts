export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  items: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  completed: boolean;
  addedAt: number;
  storeId?: string;
}

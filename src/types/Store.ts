export interface Store {
  id: string;
  name: string;
  type: StoreType;
  createdAt: number;
  updatedAt: number;
  userId: string;
  favorite: boolean;
}

export type StoreType = 'grocery' | 'supermarket' | 'convenience' | 'farmers_market' | 'specialty' | 'other';

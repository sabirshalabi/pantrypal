import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogSubtitle,
  MorphingDialogClose,
  MorphingDialogDescription,
  MorphingDialogContainer,
} from './ui/morphing-dialog';
import { CheckIcon, TrashIcon, Store } from 'lucide-react';
import NumberInput from './ui/number-input';

interface Store {
  id: string;
  name: string;
}

interface ShoppingListItemProps {
  item: {
    id: string;
    name: string;
    quantity: number;
    unit?: string;
    notes?: string;
    completed: boolean;
    storeId?: string;
  };
  stores: Store[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateStore: (id: string, storeId: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

export function ShoppingListItem({ 
  item, 
  stores, 
  onToggleComplete, 
  onDelete,
  onUpdateStore,
  onUpdateQuantity 
}: ShoppingListItemProps) {
  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : '';
  };

  return (
    <MorphingDialog
      transition={{
        type: 'spring',
        bounce: 0.05,
        duration: 0.25,
      }}
    >
      <MorphingDialogTrigger
        style={{
          borderRadius: '12px',
        }}
        className="flex w-full flex-row overflow-hidden border border-zinc-950/10 bg-white hover:bg-zinc-50 dark:border-zinc-50/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <div className="flex flex-grow flex-row items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(item.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-950/10 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:border-zinc-50/10 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
            >
              <CheckIcon size={16} className={item.completed ? 'text-green-500' : ''} />
            </button>
            <div>
              <MorphingDialogTitle 
                className={`text-lg ${
                  item.completed 
                    ? 'text-zinc-400 line-through' 
                    : 'text-zinc-950 dark:text-zinc-50'
                }`}
              >
                {item.name}
              </MorphingDialogTitle>
              <MorphingDialogSubtitle className="text-zinc-700 dark:text-zinc-400">
                {item.quantity} {item.unit || 'units'}
                {item.storeId && (
                  <span className="ml-2 inline-flex items-center text-zinc-500">
                    <Store size={14} className="mr-1" />
                    {getStoreName(item.storeId)}
                  </span>
                )}
              </MorphingDialogSubtitle>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="ml-4 flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-950/10 text-zinc-500 transition-colors hover:bg-red-100 hover:text-red-600 dark:border-zinc-50/10 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-500"
            aria-label="Delete item"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent
          style={{
            borderRadius: '24px',
          }}
          className="pointer-events-auto relative flex h-auto w-full flex-col overflow-hidden border border-zinc-950/10 bg-white p-6 dark:border-zinc-50/10 dark:bg-zinc-900 sm:w-[400px]"
        >
          <MorphingDialogTitle className="text-2xl text-zinc-950 dark:text-zinc-50">
            {item.name}
          </MorphingDialogTitle>
          <MorphingDialogSubtitle className="text-zinc-700 dark:text-zinc-400">
            {item.quantity} {item.unit || 'units'}
          </MorphingDialogSubtitle>
          <MorphingDialogDescription
            className="mt-4"
            disableLayoutAnimation
            variants={{
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: 20 },
            }}
          >
            {stores.length > 0 && (
              <div className="mb-6">
                <label htmlFor="store" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Store
                </label>
                <select
                  id="store"
                  value={item.storeId || ''}
                  onChange={(e) => onUpdateStore(item.id, e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                >
                  <option value="">Select a store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mb-6">
              <label htmlFor="quantity" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Quantity
              </label>
              <NumberInput
                id="quantity"
                value={item.quantity}
                min={1}
                max={99}
                onChange={(event, val) => onUpdateQuantity(item.id, val || 1)}
                className="mt-1"
                aria-label="Quantity"
              />
            </div>
            {item.notes && (
              <p className="text-zinc-600 dark:text-zinc-400">{item.notes}</p>
            )}
            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => onToggleComplete(item.id)}
                className="flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {item.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:hover:bg-red-500"
              >
                Delete Item
              </button>
            </div>
          </MorphingDialogDescription>
          <MorphingDialogClose />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}

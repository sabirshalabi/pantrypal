import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from '../lib/firebase';
import { ref, get, push, set } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import { AlertCircle, Check } from 'lucide-react';

export function ImportList() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function importList() {
      if (!user || !shareToken) return;

      try {
        // Get the shared list data
        const sharedListRef = ref(database, `shared_lists/${shareToken}`);
        const snapshot = await get(sharedListRef);

        if (!snapshot.exists()) {
          setError('This shared list does not exist or has expired');
          setLoading(false);
          return;
        }

        const sharedList = snapshot.val();

        // Check if the list has expired
        if (sharedList.expiresAt < Date.now()) {
          setError('This shared list has expired');
          setLoading(false);
          return;
        }

        // Create a new list for the current user
        const newListRef = push(ref(database, `lists/${user.uid}`));
        
        // Prepare the new list data
        const newListData = {
          name: `${sharedList.name} (Shared)`,
          items: sharedList.items || [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          importedFrom: {
            listId: sharedList.originalId,
            userId: sharedList.sharedBy,
            importedAt: Date.now()
          }
        };

        // Save the new list
        await set(newListRef, newListData);
        setSuccess(true);

        // Redirect to the new list after 2 seconds
        setTimeout(() => {
          navigate('/lists');
        }, 2000);

      } catch (err) {
        console.error('Error importing list:', err);
        setError('Failed to import the list. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    importList();
  }, [shareToken, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Failed</h2>
        <p className="text-gray-600 text-center mb-4">{error}</p>
        <button
          onClick={() => navigate('/lists')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Go to Lists
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Check className="h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">List Imported Successfully!</h2>
        <p className="text-gray-600 text-center">Redirecting to your lists...</p>
      </div>
    );
  }

  return null;
}

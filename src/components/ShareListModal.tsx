import React, { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, get, set } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';
import type { ShoppingList } from '../types/ShoppingList';
import { getBaseUrl } from '../utils/urlUtils';

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareListModal({ isOpen, onClose }: ShareListModalProps) {
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Fetch user's shopping lists
    const listsRef = ref(database, `lists/${user.uid}`);
    get(listsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const listsData = snapshot.val();
        const listsArray = Object.entries(listsData).map(([id, list]: [string, any]) => ({
          id,
          name: list.name
        }));
        setLists(listsArray);
      }
    });
  }, [user]);

  const generateShareUrl = async (listId: string) => {
    if (!user || !listId) return;

    // Create a share token (you might want to use a more secure method)
    const shareToken = `${listId}-${Date.now()}`;
    
    // Get the list data
    const listRef = ref(database, `lists/${user.uid}/${listId}`);
    const snapshot = await get(listRef);
    
    if (!snapshot.exists()) return;
    
    const listData = snapshot.val();
    
    // Store the shared list data
    await set(ref(database, `shared_lists/${shareToken}`), {
      ...listData,
      originalId: listId,
      sharedBy: user.uid,
      sharedAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days expiry
    });

    // Generate the share URL using the base URL utility
    const shareUrl = `${getBaseUrl()}/import-list/${shareToken}`;
    setShareUrl(shareUrl);
    setCopied(false);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-semibold mb-4">Share Shopping List</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="list" className="block text-sm font-medium text-gray-700 mb-1">
              Select List to Share
            </label>
            <select
              id="list"
              value={selectedList}
              onChange={(e) => {
                setSelectedList(e.target.value);
                generateShareUrl(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a list...</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>

          {shareUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shareable Link
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm bg-gray-50"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This link will expire in 7 days
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

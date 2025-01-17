import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { RecipeList } from '../components/RecipeList';
import { RecipeImporter } from '../components/RecipeImporter';
import { RecipeDetail } from '../components/RecipeDetail';

export function Recipes() {
  const location = useLocation();
  const isImport = location.pathname === '/recipes/import';
  const isDetail = location.pathname.startsWith('/recipes/') && !isImport;

  return (
    <div className="container mx-auto px-4 py-8">
      <Routes>
        <Route index element={<RecipeList />} />
        <Route path="import" element={<RecipeImporter />} />
        <Route path=":recipeId" element={<RecipeDetail />} />
      </Routes>
    </div>
  );
}

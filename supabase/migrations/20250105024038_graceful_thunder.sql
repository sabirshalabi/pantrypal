/*
  # Initial Schema for Grocery Shopping PWA

  1. New Tables
    - users
      - id (uuid, primary key)
      - email (text)
      - created_at (timestamp)
    
    - shopping_lists
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - name (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - list_items
      - id (uuid, primary key)
      - list_id (uuid, foreign key)
      - name (text)
      - category (text)
      - quantity (numeric)
      - unit (text)
      - price_estimate (numeric)
      - actual_price (numeric)
      - is_purchased (boolean)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - stores
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - name (text)
      - address (text)
      - layout_data (jsonb)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - recipes
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - name (text)
      - instructions (text)
      - servings (integer)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - recipe_ingredients
      - id (uuid, primary key)
      - recipe_id (uuid, foreign key)
      - name (text)
      - quantity (numeric)
      - unit (text)
      - created_at (timestamp)
    
    - meal_plans
      - id (uuid, primary key)
      - user_id (uuid, foreign key)
      - recipe_id (uuid, foreign key)
      - planned_date (date)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create tables
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text,
  price_estimate numeric,
  actual_price numeric,
  is_purchased boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  layout_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  instructions text,
  servings integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL,
  unit text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  planned_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own data"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can manage their shopping lists"
  ON shopping_lists
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their list items"
  ON list_items
  FOR ALL
  TO authenticated
  USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their stores"
  ON stores
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their recipes"
  ON recipes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their recipe ingredients"
  ON recipe_ingredients
  FOR ALL
  TO authenticated
  USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their meal plans"
  ON meal_plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);
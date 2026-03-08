import { FoodItem } from './types';

export const FOOD_DATABASE: FoodItem[] = [
  { id: '1', name: 'Chicken Breast (grilled)', calories: 165, protein: 31, carbs: 0, fats: 3.6, servingSize: '100g', category: 'Protein' },
  { id: '2', name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fats: 1.8, servingSize: '1 cup cooked', category: 'Grains' },
  { id: '3', name: 'Scrambled Eggs (2)', calories: 182, protein: 12, carbs: 2, fats: 14, servingSize: '2 eggs', category: 'Protein' },
  { id: '4', name: 'Avocado Toast', calories: 250, protein: 6, carbs: 26, fats: 15, servingSize: '1 slice', category: 'Snack' },
  { id: '5', name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fats: 0.7, servingSize: '170g', category: 'Dairy' },
  { id: '6', name: 'Salmon Fillet', calories: 208, protein: 20, carbs: 0, fats: 13, servingSize: '100g', category: 'Protein' },
  { id: '7', name: 'Sweet Potato', calories: 103, protein: 2.3, carbs: 24, fats: 0.1, servingSize: '1 medium', category: 'Vegetables' },
  { id: '8', name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fats: 0.4, servingSize: '1 medium', category: 'Fruit' },
  { id: '9', name: 'Almonds', calories: 164, protein: 6, carbs: 6, fats: 14, servingSize: '28g', category: 'Nuts' },
  { id: '10', name: 'Oatmeal', calories: 154, protein: 5, carbs: 27, fats: 2.6, servingSize: '1 cup cooked', category: 'Grains' },
  { id: '11', name: 'Broccoli', calories: 55, protein: 3.7, carbs: 11, fats: 0.6, servingSize: '1 cup', category: 'Vegetables' },
  { id: '12', name: 'Whey Protein Shake', calories: 120, protein: 24, carbs: 3, fats: 1.5, servingSize: '1 scoop', category: 'Supplement' },
  { id: '13', name: 'Quinoa', calories: 222, protein: 8, carbs: 39, fats: 3.6, servingSize: '1 cup cooked', category: 'Grains' },
  { id: '14', name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, servingSize: '1 medium', category: 'Fruit' },
  { id: '15', name: 'Peanut Butter', calories: 188, protein: 8, carbs: 6, fats: 16, servingSize: '2 tbsp', category: 'Nuts' },
  { id: '16', name: 'Whole Wheat Bread', calories: 69, protein: 3.6, carbs: 12, fats: 1.1, servingSize: '1 slice', category: 'Grains' },
  { id: '17', name: 'Cottage Cheese', calories: 98, protein: 11, carbs: 3.4, fats: 4.3, servingSize: '100g', category: 'Dairy' },
  { id: '18', name: 'Spinach Salad', calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4, servingSize: '1 cup', category: 'Vegetables' },
  { id: '19', name: 'Turkey Breast', calories: 135, protein: 30, carbs: 0, fats: 1, servingSize: '100g', category: 'Protein' },
  { id: '20', name: 'Blueberries', calories: 85, protein: 1.1, carbs: 21, fats: 0.5, servingSize: '1 cup', category: 'Fruit' },
];

export function searchFoods(query: string): FoodItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return FOOD_DATABASE.slice(0, 10);
  return FOOD_DATABASE.filter(f => 
    f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)
  );
}

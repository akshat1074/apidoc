import 'dotenv/config';
import { analyzeCode } from './services/aiService';

const sampleCode = `
export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

export class ShoppingCart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
  }
  
  getTotal() {
    return calculateTotal(this.items);
  }
}
`;

async function test() {
  try {
    console.log('🔍 Analyzing code with Grok...\n');
    
    const result = await analyzeCode(sampleCode, 'cart.js');
    
    console.log('✅ Documentation generated:\n');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
'use strict';
const CHART_COLORS = ['#e2628a','#2db87b','#f59e0b','#a78bfa','#f43f5e','#38bdf8','#fb923c'];

const CAT_EMOJI = {
  mountain: '🏔️', beach: '🏖️', culture: '🏛️', adventure: '🧗',
  city: '🌆', food: '🍜', nature: '🌿', history: '🏯',
  island: '🏝️', forest: '🌲', lake: '🏞️', waterfall: '💧'
};
function catEmoji(cat) {
  return CAT_EMOJI[(cat || '').toLowerCase()] || '✈️';
}

const SEED_USERS = [
  { user_id: 1, fullname: 'Demo Student', username: 'demo', email: 'demo@wanderlust.vn', phone: '0987654321', password: '123456789' }
];

const SEED_BUDGETS = [
  { source_id: 1, source_name: 'Part-time Job Savings', init_amount: 12000000, user_id: 1 },
  { source_id: 2, source_name: 'Family Support',         init_amount: 8000000,  user_id: 1 },
  { source_id: 3, source_name: 'Scholarship Fund',       init_amount: 5000000,  user_id: 1 }
];

const SEED_DESTINATIONS = [
  { id: 1, name: 'Da Lat Highlands',  category: 'Mountain',  budget: 2500000, priority: 5, status: 1, source_id: 1 },
  { id: 2, name: 'Phu Quoc Island',   category: 'Beach',     budget: 4200000, priority: 4, status: 0, source_id: 1 },
  { id: 3, name: 'Hoi An Ancient Town', category: 'Culture', budget: 1800000, priority: 3, status: 1, source_id: 2 },
  { id: 4, name: 'Sapa Trekking',     category: 'Adventure', budget: 3000000, priority: 5, status: 0, source_id: 2 },
  { id: 5, name: 'Ha Giang Loop',     category: 'Adventure', budget: 2200000, priority: 4, status: 0, source_id: 3 }
];
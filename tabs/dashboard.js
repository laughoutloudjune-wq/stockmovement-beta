import { ref, onMounted, computed } from 'vue';
import { apiGet, STR } from '../shared.js'; // Reusing your existing shared.js

export default {
  props: ['lang'],
  setup(props) {
    // State
    const lowStock = ref([]);
    const topItems = ref([]);
    const loading = ref({ low: true, items: true });
    
    // Computed text helper
    const S = computed(() => STR[props.lang]);

    // Data Fetching
    const fetchData = async () => {
      // 1. Low Stock
      try {
        const res = await apiGet('dash_LowStock', {}, { cacheTtlMs: 60_000 });
        lowStock.value = Array.isArray(res) ? res : [];
      } catch (e) { console.error(e); } 
      finally { loading.value.low = false; }

      // 2. Top Items
      try {
        const res = await apiGet('dash_TopItems', {}, { cacheTtlMs: 60_000 });
        topItems.value = Array.isArray(res) ? res : [];
      } catch (e) { console.error(e); } 
      finally { loading.value.items = false; }
    };

    onMounted(() => {
      fetchData();
    });

    return { lowStock, topItems, loading, S };
  },
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      <section class="glass rounded-2xl p-5 shadow-sm">
        <h3 class="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
          🔴 {{ S.dashLow }}
        </h3>
        
        <div v-if="loading.low" class="space-y-3 animate-pulse">
          <div v-for="i in 3" class="h-12 bg-slate-200/50 rounded-xl"></div>
        </div>

        <div v-else class="space-y-2">
          <div v-if="lowStock.length === 0" class="text-slate-400 text-center py-4">{{ S.noLow }}</div>
          
          <div 
            v-for="item in lowStock" 
            :key="item.name"
            class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm"
          >
            <div>
              <div class="font-bold text-slate-700">{{ item.name }}</div>
              <div class="text-xs text-slate-400">Min: {{ item.min }}</div>
            </div>
            <span class="px-3 py-1 bg-red-100 text-red-600 font-extrabold rounded-lg text-sm">
              {{ item.stock }}
            </span>
          </div>
        </div>
      </section>

      <section class="glass rounded-2xl p-5 shadow-sm">
        <h3 class="font-bold text-lg mb-4 text-slate-800">🏆 {{ S.dashTopItems }}</h3>
        
        <div v-if="loading.items" class="space-y-3 animate-pulse">
          <div v-for="i in 3" class="h-12 bg-slate-200/50 rounded-xl"></div>
        </div>

        <div v-else class="space-y-2">
          <div 
            v-for="(item, idx) in topItems" 
            :key="idx"
            class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm"
          >
            <div class="font-bold text-slate-700">{{ item.name }}</div>
            <div class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
              {{ item.qty }}
            </div>
          </div>
        </div>
      </section>

    </div>
  `
};

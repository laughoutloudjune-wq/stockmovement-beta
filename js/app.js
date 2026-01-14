import { createApp, ref, computed, onMounted } from 'vue';
import { STR, applyLangTexts, currentLang } from './shared.js';

// Import Components (We will convert these one by one)
import Dashboard from './components/Dashboard.js';
// import StockIn from './components/StockIn.js'; // You would convert other tabs similarly

const App = {
  setup() {
    const lang = ref(currentLang()); // 'th' or 'en'
    const currentTab = ref('dashboard');
    const S = computed(() => STR[lang.value]);

    // Simple Tab Mapping
    const tabs = [
      { key: 'dashboard', label: 'dash', component: Dashboard },
      { key: 'out',       label: 'out',  component: null }, // Placeholder until converted
      { key: 'in',        label: 'in',   component: null },
      { key: 'adjust',    label: 'adj',  component: null },
      { key: 'purchase',  label: 'pur',  component: null },
      { key: 'report',    label: 'report', component: null },
    ];

    const activeComponent = computed(() => {
      const t = tabs.find(t => t.key === currentTab.value);
      return t ? t.component : null;
    });

    const switchLang = (l) => {
      lang.value = l;
      document.documentElement.lang = l;
    };

    return {
      lang,
      S,
      currentTab,
      tabs,
      activeComponent,
      switchLang
    };
  },
  template: `
    <div class="max-w-4xl mx-auto p-4 md:p-6 pb-24 space-y-6">
      <header class="flex justify-between items-center">
        <h1 class="text-2xl font-extrabold text-slate-800 tracking-tight">{{ S.title }}</h1>
        <div class="flex bg-white rounded-full p-1 shadow-sm border border-slate-200">
          <button @click="switchLang('th')" :class="{'bg-blue-500 text-white shadow-md': lang==='th', 'text-slate-500 hover:bg-slate-50': lang!=='th'}" class="px-4 py-1.5 rounded-full text-sm font-bold transition-all">ไทย</button>
          <button @click="switchLang('en')" :class="{'bg-blue-500 text-white shadow-md': lang==='en', 'text-slate-500 hover:bg-slate-50': lang!=='en'}" class="px-4 py-1.5 rounded-full text-sm font-bold transition-all">EN</button>
        </div>
      </header>

      <nav class="sticky top-2 z-50 glass rounded-2xl p-2 flex gap-2 overflow-x-auto no-scrollbar shadow-lg shadow-blue-900/5">
        <button 
          v-for="t in tabs" 
          :key="t.key"
          @click="currentTab = t.key"
          :class="currentTab === t.key ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:bg-white/60'"
          class="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
        >
          {{ S.tabs[t.label] }}
        </button>
      </nav>

      <main class="min-h-[50vh]">
        <div v-if="activeComponent">
          <component :is="activeComponent" :lang="lang" />
        </div>
        <div v-else class="text-center py-12 text-slate-400">
          <div class="text-4xl mb-2">🚧</div>
          <p>Tab "{{ currentTab }}" is being updated to Vue.</p>
        </div>
      </main>
    </div>
  `
};

createApp(App).mount('#app');

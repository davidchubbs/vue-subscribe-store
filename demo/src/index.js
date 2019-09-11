
import {
  mapState,
  mapGetters,
  mapMutations,
  mapActions
} from './store'

new Vue({
  el: '#app',
  computed: {
    ...mapState(['num', 'label']),
    ...mapGetters(['isEven']),
  },
  methods: {
    ...mapMutations(['incNum', 'decNum']),
    ...mapActions(['resetNum']),
  },
  template: `
    <div class="ml-auto mr-auto my-20 max-w-md rounded overflow-hidden shadow-lg bg-white">
      <div class="px-6 py-4 bg-gray-100 text-gray-700">
        <div class="font-bold text-3xl text-center">{{ label || num }}</div>
      </div>
      <div class="px-6 pt-8 pb-4">
        <button @click="incNum" class="bg-gray-600 hover:bg-gray-700 outline-none text-white font-bold h-12 w-12 mr-2 rounded-full">+</button>
        <button @click="decNum" class="bg-gray-600 hover:bg-gray-700 outline-none text-white font-bold h-12 w-12 mr-2 rounded-full">-</button>
        <button @click="resetNum" class="bg-gray-600 hover:bg-red-700 outline-none text-white font-bold h-12 w-12 mr-2 rounded-full">x</button>
      </div>
      <div class="px-6 py-4">
        <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
          #{{ isEven ? 'even' : 'odd' }}
        </span>
      </div>
    </div>
  `
})

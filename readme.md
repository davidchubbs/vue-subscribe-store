# Vue Subscribe Store

## Why?

1. Use any store that uses a `subscribe` method, such as svelte-store, with Vue.js. This package will subscribe to state changes and offer it to Vue in a way that's reactive.

2. (Optional) Offers the same API as Vuex, so it's easy to convert vuex modules into another store type. This is optional&mdash;you could just offer a map of state and have a separate system for updating state. See examples for details.

## Examples

```js
import vuesub from 'vue-subscribe-store'
import { writable } from 'svelte/store'

Vue.use(vuesub)

const {
  mapState,
  mapMutations
} = vuesub.store({
  state: {
    value: writable(0), // writable() returns { subscribe }
    foo: 'treated as a static value'
  },
  mutators: {
    setValue(state, next) {
      // receive `state` as is; since we're using svelte-store,
      // writable objects have a .set method
      state.value.set(next)
    },
    resetValue(state) {
      state.value.set(0)
    }
  }
})

Vue.component('example', {
  // integrates `value` in a way that works with vue's reactivity model
  computed: mapState(['value']),
  methods: mapMutations(['setValue', 'resetValue']),
  template: `
  <div>
    <button @click="() => setValue(value + 1)">
      {{ value }}
    </button>
    <button @click="resetValue">x</button>
  </div>
  `
})
```

`map*` offers the same API as Vuex, either `['name']` or `{ rename: 'name' }`. Currently no support for sub-modules, so `mapActions('moduleName', ['name'])` would not work.

`Vue.use()` will add `this.$store` to your vue components. It's schema is the same as vuex.

For example:

```js
Vue.component('example', {
  computed: {
    value() {
      return this.$store.state.value
    }
  },
  methods: {
    setName(value) {
      this.$store.dispatch('setName', value)
    },
    ...mapActions(['setAge']),
    ...mapActions({
      setStatus: 'setRelationshipStatus'
    })
  }
})
```

To use along side Vuex, you can give the store an alternative name:

```js
Vue.use(vuex)
Vue.use(vuesub, {
  name: 'svelte'
})

Vue.component('example', {
  created() {
    this.$store   // vuex
    this.$svelte  // vuesub
  }
})
```

If you are familiar with Vuex, you can provide `state`, `getters`, `mutators`, & `actions`. You can then integrate them into your vue-component using the `mapState`, `mapGetters`, `mapMutations`, and `mapActions`.

See the _demo_ directory for a fully functional example.

```js
import vuesub from 'vue-subscribe-store'
import { writable, derived } from 'svelte/store'

Vue.use(vuesub)

const {
  mapState,
  mapGetters,
  mapMutations,
  mapActions
} = vuesub.store({
  state: {
    value: writable(0)
  },
  getters: {
    isEven(state) {
      return derived(state.value, v => v % 2 === 0)
    },
    isOdd(state, getters) {
      return derived(getters.isEven, v => !v)
    }
  },
  mutators: {
    setValue(state, next) {
      state.value.set(next)
    }
  },
  actions: {
    empty({ commit }) {
      commit('setValue', 0)
    },
    change({ commit }, value) {
      commit('setValue', value)
    }
  }
})

Vue.component('example', {
  computed: {
    ...mapState(['value']),
    ...mapGetters(['isEven'])
  },
  methods: {
    ...mapActions(['empty', 'change']),
    inc() {
      this.change(this.value + 1)
    }
  },
  template: `
  <div>
    <button @click="inc">
      {{ value }}
    </button>
    <button @click="empty">x</button>
    <span>{{ isEven ? 'Even' : 'Odd' }}</span>
  </div>
  `
})
```


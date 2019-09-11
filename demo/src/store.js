
import vuesub from 'vue-subscribe-store'
import {
  writable,
  derived
} from 'svelte/store'

Vue.use(vuesub)

const store = vuesub.store({
  state: {
    num: writable(0),
    label: writable('')
  },
  getters: {
    isEven(state) {
      return derived(state.num, v => v % 2 === 0)
    },
    isOdd(state, getters) {
      return derived(getters.isEven, v => !v)
    }
  },
  mutators: {
    incNum(state) {
      state.num.update(v => v + 1)
    },
    decNum(state) {
      state.num.update(v => v - 1)
    },
    resetNum(state) {
      state.num.set(0)
    },
    setLabel(state, label) {
      state.label.set(label)
    }
  },
  actions: {
    resetNum({ state, getters, commit, dispatch }, payload) {
      commit('setLabel', 'Resetting')
      setTimeout(() => {
        commit('setLabel', '')
        commit('resetNum')
      }, 1000)
    }
  }
})

export const mapState = store.mapState
export const mapGetters = store.mapGetters
export const mapMutations = store.mapMutations
export const mapActions = store.mapActions


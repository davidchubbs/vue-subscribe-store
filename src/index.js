
let _Vue = null
const _store = {}

function store({
  state = {},
  getters = {},
  mutators = {},
  actions = {}
}) {
  const stateValues = makeSubscribedState(state)
  const vueState = makeVueState(stateValues)
  const mapState = reducer(vueState)

  const derived = makeDerivedState(state, getters)
  const derivedValues = makeSubscribedState(derived)
  const vueDerived = makeVueState(derived)
  const mapGetters = reducer(vueDerived)

  const context = makeContext({
    state,
    derived,
    mutators,
    actions
  })
  const committers = bindContext(context, 'commit', mutators)
  const mapMutations = reducer(committers)
  const dispatchers = bindContext(context, 'dispatch', actions)
  const mapActions = reducer(dispatchers)

  Object.assign(_store, context)

  return {
    mapState,
    mapGetters,
    mapMutations,
    mapActions
  }
}

function install(vue, ops = {}) {
  _Vue = vue
  const propName = ops.name || 'store'
  vue.property[`$${propName}`] = _store
}

// Makes an object with the values of the current state,
// and register subscribers to keep values up-to-date
function makeSubscribedState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw Error('Expecting an object for state')
  }
  const values = {}
  for (let name in state) {
    if (!state.hasOwnProperty(name)) continue
    // copy static / simple values over
    if (state[name] === null || typeof state[name] !== 'object' || Array.isArray(state[name])) {
      values[name] = state[name]
    }
    // recurse nested state
    else if (typeof state[name].subscribe !== 'function') {
      values[name] = makeSubscribedState(state[name])
    }
    // subscribe to state changes
    else {
      state[name].subscribe(v => values[name] = v)
    }
  }
  return values
}

// Register derived state from vuex-like getter functions
function makeDerivedState(state, fns) {
  const derived = {}
  const getters = {}
  for (let name in fns) {
    if (!fns.hasOwnProperty(name)) continue
    Object.defineProperty(getters, name, {
      enumerable: true,
      get() {
        // make sure each getter-fn is only invoked once
        if (!derived[name]) {
          derived[name] = fns[name](state, getters)
        }
        return derived[name]
      }
    })
  }
  for (let name in getters) getters[name]
  return derived
}

// Make values of state observable to Vue, then wrap in functions
// so they can be merged in as Vue `computed` props
function makeVueState(values) {
  if (!_Vue || typeof _Vue.observable !== 'function') {
    throw Error('Install package with Vue.use()')
  }
  let observable = _Vue.observable(values)
  let wrap = wrapValues(observable)
  return wrap
}

// Vue requires computed props to be wrapped in functions.
function wrapValues(values) {
  let wrapped = {}
  for (let name in values) {
    if (!values.hasOwnProperty(name)) continue
    wrapped[name] = () => values[name]
  }
  return wrapped
}

// Make the context of actions with a similar schema to vuex
function makeContext({ state, derived, mutators, actions }) {
  const context = {
    state,
    getters: derived,
    commit(name, payload) {
      if (typeof mutators[name] !== 'function') throw Error(`Unknown mutator "${name}"`)
      return mutators[name](state, payload)
    },
    dispatch(name, payload) {
      if (typeof actions[name] !== 'function') throw Error(`Unknown action "${name}"`)
      return Promise.resolve(actions[name](context, payload))
    }
  }
  return context
}

// Commit when invoking mutator /  dispatch when invoking action.
// To do this, we return `dispatch` from context, with the `name`
// pre-bound; that way invoking the action is the same as dispatching it.
// The same applies to mutators and `commit`.
function bindContext(context, type, fns) {
  let cx = {}
  for (let name in fns) {
    if (!fns.hasOwnProperty(name)) continue
    Object.defineProperty(cx, name, {
      enumerable: true,
      get() {
        return context[type].bind(null, name)
      }
    })
  }
  return cx
}

// Given the complete dataset, return a function that can
// be invoked to return a subset.
// Dataset: { a, b, c }
// Returns a function that can handle payloads like:
//   [ 'a', 'b'] => { a, b }
//   { x: 'a', y: 'b' } => { x: a, y: b }
//   { x: ({ a, b }) => z } => { x: z }
function reducer(obj) {
  return payload => {
    let subset = {}
    if (Array.isArray(payload)) {
      for (let i=0; i<payload.length; i++) {
        let name = payload[i]
        subset[name] = obj[name]
      }
    }
    else if (typeof payload === 'object' && payload) {
      for (let name in payload) {
        if (!payload.hasOwnProperty(name)) continue
        switch(typeof payload[name]) {
          case 'string':
            subset[name] = obj[payload[name]]
            break
          case 'function':
            subset[name] = payload[name](obj)
            break
        }
      }
    }
    return subset
  }
}

if (process.env.NODE_ENV === 'test') {
  exports.makeSubscribedState = makeSubscribedState
  exports.makeDerivedState = makeDerivedState
  exports.makeVueState = makeVueState
  exports.wrapValues = wrapValues
  exports.makeContext = makeContext
  exports.bindContext = bindContext
  exports.reducer = reducer
}
exports.store = store
exports.install = install

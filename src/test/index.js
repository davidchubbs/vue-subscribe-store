import { assert } from 'chai'
import sinon from 'sinon'
import lib from '../index'

describe('makeSubscribedState', () => {
  it('Should subscribe to subscribable state', () => {
    let value = 5
    let called = false
    let state = {
      foo: {
        subscribe(cb) {
          cb(value)
          called = true
        }
      }
    }
    let sub = lib.makeSubscribedState(state)
    assert(called)
    assert.deepEqual(sub, {
      foo: value
    })
  })
  it('Should subscribe to deeply nested state', () => {
    let called = []
    let subscribe = (cb) => {
      const len = called.push(true)
      cb(len)
    }
    let state = {
      foo: { subscribe },
      bar: {
        baz: { subscribe },
        qux: { subscribe }
      }
    }
    let sub = lib.makeSubscribedState(state)
    assert(called.length === 3)
    assert.deepEqual(sub, {
      foo: 1,
      bar: {
        baz: 2,
        qux: 3
      }
    })
  })
  it('Should keep state up to date', () => {
    let callback
    let init = 5
    let next = 10
    let sub = lib.makeSubscribedState({
      foo: {
        subscribe(cb) {
          cb(init) // initial value
          callback = cb
        }
      }
    })
    assert(sub.foo, init)
    callback(next)
    assert(sub.foo, next)
  })
  it('Should return static / non-subscribable values', () => {
    let state = {
      foo: 'bar',
      baz: {
        a: 1,
        b: false
      },
      qux: [1, true]
    }
    let sub = lib.makeSubscribedState(state)
    assert.deepEqual(state, sub)
  })
})

describe('makeDerivedState', () => {
  it('should provide state & derived-state as arguments', () => {
    let _state = { a: 1 }
    let temp = lib.makeDerivedState(_state, {
      foo(state, getters) {
        assert(_state === state)
        assert.deepEqual(Object.keys(getters), ['foo', 'bar'])
      },
      bar() {}
    })
  })
  it('should resolve dependencies & invoke each exactly once', () => {
    let tested = {
      foo: 0,
      bar: 0,
      baz: 0,
      qux: 0
    }
    let temp = lib.makeDerivedState({}, {
      foo(_, getters) {
        assert(getters.bar)
        tested.foo++
      },
      // best tested if dependency is declared *after* the calling function
      bar(_, getters) {
        assert(getters.baz)
        tested.bar++
        return true
      },
      baz() {
        tested.baz++
        return true
      },
      qux() {
        tested.qux++
      }
    })
    // make sure each function was called, and only called once
    assert.deepEqual(tested, {
      foo: 1,
      bar: 1,
      baz: 1,
      qux: 1
    })
  })
})

describe('makeVueState', () => {
  it('should require Vue.use in order to work', () => {
    assert.throws(() => {
      lib.makeVueState({})
    })
    assert.doesNotThrow(() => {
      lib.install({
        observable: values => values,
        prototype: {}
      })
      lib.makeVueState({})
    })
  })
  it('should wrap values in functions', () => {
    const vue = lib.makeVueState({
      foo: 'bar'
    })
    assert.equal(typeof vue.foo, 'function')
    assert.equal(vue.foo(), 'bar')
  })
})

describe('wrapValues', () => {
  it('should wrap values in functions', () => {
    let state = { foo: 1 }
    let wrapped = lib.wrapValues(state)
    assert.deepEqual(Object.keys(wrapped), ['foo'])
    assert(typeof wrapped.foo === 'function')
    assert(wrapped.foo() === 1)
  })
})

describe('makeContext', () => {
  it('should include state as part of context', () => {
    const state = {}
    const context = lib.makeContext({ state })
    assert.equal(state, context.state)
  })
  it('should include derived-state as part of context', () => {
    const derived = {}
    const context = lib.makeContext({ derived })
    assert.equal(derived, context.getters)
  })
  it('should provide a commit method for mutators', () => {
    let stateGiven = null
    let propsGiven = null
    let called = 0
    const state = {}
    const mutators = {
      foo(state, props) {
        called++
        stateGiven = state
        propsGiven = props
      }
    }
    const context = lib.makeContext({ state, mutators })
    assert.equal(typeof context.commit, 'function')
    context.commit('foo', 'bar')
    assert.equal(stateGiven, state)
    assert.equal(propsGiven, 'bar')
    assert.equal(called, 1)
  })
  it('should provide a dispatch method for actions', () => {
    let contextGiven = null
    let propsGiven = null
    let called = 0
    const actions = {
      foo(cx, props) {
        called++
        contextGiven = cx
        propsGiven = props
      }
    }
    const context = lib.makeContext({ actions })
    assert.equal(typeof context.dispatch, 'function')
    context.dispatch('foo', 'bar')
    // Context given to actions should be the same context returned from `makeContext`;
    // and if so, we already test `makeContext` properly handles state, derived, & mutators.
    assert.equal(context, contextGiven)
    assert.equal(propsGiven, 'bar')
    assert.equal(called, 1)
  })
})

describe('bindContext', () => {
  it('should return a map of named actions', () => {
    let nameGiven = null
    let propsGiven = null
    let called = 0
    const context = {
      dispatch(name, ops) {
        called++
        nameGiven = name
        propsGiven = ops
      }
    }
    const actions = {
      foo() {}
    }
    const bound = lib.bindContext(context, 'dispatch', actions)
    bound.foo('bar')
    assert.equal(nameGiven, 'foo')
    assert.equal(propsGiven, 'bar')
    assert.equal(called, 1)
  })
})

describe('reducer', () => {

  const state = { foo: 1, bar: 2, baz: 3 }

  it('should return a subset of state if given an array', () => {
    const values = lib.reducer(state)(['foo', 'bar'])
    assert.deepEqual(values, {
      foo: 1,
      bar: 2
    })
  })

  it('should return a subset of state with remapped prop names if given a map of strings', () => {
    const values = lib.reducer(state)({ baz: 'foo', qux: 'bar' })
    assert.deepEqual(values, {
      baz: 1,
      qux: 2
    })
  })

  it('should return a map of computed values if given a map of functions; each fn given entire state', () => {
    const values = lib.reducer(state)({
      foo(state) {
        assert.deepEqual(state, {
          foo: 1,
          bar: 2,
          baz: 3
        })
        return state.foo
      },
      bar: (state) => state.bar,
    })
    assert.deepEqual(values, {
      foo: 1,
      bar: 2
    })
  })
})

describe('install', () => {
  it('should add $store to prototype', () => {
    const prototype = {}
    lib.install({
      prototype
    })
    assert(prototype.hasOwnProperty('$store'))
  })
  it('should change the prototype name if custom name given', () => {
    const prototype = {}
    lib.install({
      prototype,
    }, {
      name: 'custom'
    })
    assert(prototype.hasOwnProperty('$custom'))
  })
})

describe('store', () => {
  it('should return map functions when invoked', () => {
    lib.install({
      observable: values => values,
      prototype: {}
    })
    const store = lib.store({})
    assert.equal(typeof store, 'object')
    assert.equal(typeof store.mapState, 'function')
    assert.equal(typeof store.mapGetters, 'function')
    assert.equal(typeof store.mapMutations, 'function')
    assert.equal(typeof store.mapActions, 'function')
  })
  it('should prepare state for vue', () => {
    const store = lib.store({
      state: {
        foo: { subscribe: cb => cb('bar') },
        baz: 'qux'
      }
    })
    const { foo, baz } = store.mapState(['foo', 'baz'])
    assert.equal(typeof foo, 'function')
    assert.equal(typeof baz, 'function')
    assert.equal(foo(), 'bar')
    assert.equal(baz(), 'qux')
  })
  it('should prepare getters for vue', () => {
    const store = lib.store({
      getters: {
        foo() {
          return { subscribe: cb => cb('bar') }
        },
        baz() {
          return 'qux'
        }
      }
    })
    const { foo, baz } = store.mapGetters(['foo', 'baz'])
    assert.equal(typeof foo, 'function')
    assert.equal(typeof baz, 'function')
    assert.equal(foo(), 'bar')
    assert.equal(baz(), 'qux')
  })
  it('should prepare mutators for vue', () => {
    let propsGiven = null
    const store = lib.store({
      mutators: {
        foo(state, props) {
          propsGiven = props
        }
      }
    })
    const { foo } = store.mapMutations(['foo'])
    assert.equal(typeof foo, 'function')
    foo('bar')
    assert.equal(propsGiven, 'bar')
  })
  it('should prepare actions for vue', () => {
    let propsGiven = null
    const store = lib.store({
      actions: {
        foo(context, props) {
          propsGiven = props
        }
      }
    })
    const { foo } = store.mapActions(['foo'])
    assert.equal(typeof foo, 'function')
    foo('bar')
    assert.equal(propsGiven, 'bar')
  })
})

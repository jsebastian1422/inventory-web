import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MenuColumnsControl from './MenuColumnsControl.vue'

function setup(modelValue = 4) {
  const wrapper = mount(MenuColumnsControl, {
    props: {
      modelValue,
      'onUpdate:modelValue': (v: number) => wrapper.setProps({ modelValue: v }),
    },
    attachTo: document.body,
  })
  return wrapper
}

describe('MenuColumnsControl keyboard (OBS-3)', () => {
  it('has label, radiogroup and roving tabindex (single tab stop)', () => {
    const w = setup(3)
    const group = w.find('[role="radiogroup"]')
    expect(document.getElementById(group.attributes('aria-labelledby')!)?.textContent).toBe(
      'Cards por fila',
    )
    const tabs = w.findAll('[role="radio"]').map((b) => b.attributes('tabindex'))
    expect(tabs).toEqual(['-1', '0', '-1', '-1'])
    w.unmount()
  })

  it.each([
    ['ArrowRight', 4, 5],
    ['ArrowDown', 4, 5],
    ['ArrowLeft', 4, 3],
    ['ArrowUp', 4, 3],
    ['ArrowRight', 5, 2],
    ['ArrowLeft', 2, 5],
    ['Home', 4, 2],
    ['End', 3, 5],
  ])('%s from %i selects %i and moves focus', async (key, from, to) => {
    const w = setup(from)
    await w.find(`[data-value="${from}"]`).trigger('keydown', { key })
    await w.vm.$nextTick()
    expect(w.find(`[data-value="${to}"]`).attributes('aria-checked')).toBe('true')
    expect(w.findAll('[aria-checked="true"]')).toHaveLength(1)
    expect(document.activeElement).toBe(w.find(`[data-value="${to}"]`).element)
    w.unmount()
  })

  it('ignores other keys', async () => {
    const w = setup(4)
    await w.find('[data-value="4"]').trigger('keydown', { key: 'a' })
    expect(w.emitted('update:modelValue')).toBeUndefined()
    w.unmount()
  })
})

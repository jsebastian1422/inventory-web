import { describe, expect, it } from 'vitest'
import { MODULES } from './catalog'
import { filterModules } from './useModules'

const titles = (permissions: string[]) => filterModules(permissions).map((m) => m.title)

describe('catalog', () => {
  it('CA-1: has the 9 modules in order, with valid descriptions, paths and icons', () => {
    expect(MODULES.map((m) => m.path)).toEqual([
      '/users',
      '/roles',
      '/establishments',
      '/categories',
      '/products',
      '/inventories',
      '/stock',
      '/carts',
      '/sales',
    ])
    expect(MODULES.map((m) => m.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    for (const m of MODULES) {
      expect(m.description.length).toBeGreaterThan(0)
      expect(m.description.length).toBeLessThanOrEqual(90)
      expect(m.icon).toMatch(/\.svg|^data:image\/svg/)
      expect(m.anyOf.length).toBeGreaterThan(0)
    }
    expect(MODULES.find((m) => m.id === 'carts')!.anyOf).toEqual(['carts.use', 'carts.read'])
    expect(MODULES.find((m) => m.id === 'sales')!.anyOf).toEqual(['sales.read', 'sales.create'])
  })
})

describe('filterModules', () => {
  it('CA-2: shows exactly the permitted modules in catalog order', () => {
    expect(titles(['sales.create', 'products.read', 'inventories.read'])).toEqual([
      'Productos',
      'Inventarios',
      'Ventas',
    ])
  })
  it('CA-2: all permissions give the 9 modules', () => {
    const all = MODULES.flatMap((m) => m.anyOf)
    expect(filterModules(all)).toHaveLength(9)
  })
  it('CA-2: either permission of carts and sales is enough', () => {
    expect(titles(['carts.read'])).toEqual(['Carritos'])
    expect(titles(['carts.use'])).toEqual(['Carritos'])
    expect(titles(['sales.read'])).toEqual(['Ventas'])
    expect(titles(['sales.create'])).toEqual(['Ventas'])
  })
  it('CA-3: unknown or no permissions give nothing; matching is exact', () => {
    expect(titles([])).toEqual([])
    expect(titles(['users.write', 'user.read', 'USERS.READ'])).toEqual([])
  })
})

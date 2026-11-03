import carts from './icons/carts.svg'
import categories from './icons/categories.svg'
import establishments from './icons/establishments.svg'
import inventories from './icons/inventories.svg'
import products from './icons/products.svg'
import roles from './icons/roles.svg'
import sales from './icons/sales.svg'
import stock from './icons/stock.svg'
import users from './icons/users.svg'

/** Modulo del menu. Un usuario lo ve si tiene ALGUNO de los permisos de `anyOf`. */
export interface ModuleEntry {
  id: string
  title: string
  /** Descripcion corta (maximo 90 caracteres). */
  description: string
  /** URL del icono SVG propio. */
  icon: string
  path: string
  anyOf: string[]
  order: number
}

/**
 * Catalogo fijo de modulos, ordenado. Los codigos de permiso deben coincidir con los de
 * `inventory-api/packages/shared/src/auth/permissions.ts`.
 */
export const MODULES: readonly ModuleEntry[] = [
  {
    id: 'users',
    title: 'Usuarios',
    description: 'Administra las personas que acceden al sistema.',
    icon: users,
    path: '/users',
    anyOf: ['users.read'],
    order: 1,
  },
  {
    id: 'roles',
    title: 'Roles',
    description: 'Define los roles y los permisos de cada uno.',
    icon: roles,
    path: '/roles',
    anyOf: ['roles.read'],
    order: 2,
  },
  {
    id: 'establishments',
    title: 'Locales',
    description: 'Gestiona las tiendas y bodegas del negocio.',
    icon: establishments,
    path: '/establishments',
    anyOf: ['establishments.read'],
    order: 3,
  },
  {
    id: 'categories',
    title: 'Categorías',
    description: 'Organiza los productos por categorías.',
    icon: categories,
    path: '/categories',
    anyOf: ['categories.read'],
    order: 4,
  },
  {
    id: 'products',
    title: 'Productos',
    description: 'Consulta y mantén el catálogo de productos.',
    icon: products,
    path: '/products',
    anyOf: ['products.read'],
    order: 5,
  },
  {
    id: 'inventories',
    title: 'Inventarios',
    description: 'Controla los inventarios y sus movimientos.',
    icon: inventories,
    path: '/inventories',
    anyOf: ['inventories.read'],
    order: 6,
  },
  {
    id: 'stock',
    title: 'Existencias',
    description: 'Busca cuántas unidades hay de cada producto.',
    icon: stock,
    path: '/stock',
    anyOf: ['stock.search'],
    order: 7,
  },
  {
    id: 'carts',
    title: 'Carritos',
    description: 'Arma y administra los carritos de venta.',
    icon: carts,
    path: '/carts',
    anyOf: ['carts.use', 'carts.read'],
    order: 8,
  },
  {
    id: 'sales',
    title: 'Ventas',
    description: 'Registra y consulta las ventas realizadas.',
    icon: sales,
    path: '/sales',
    anyOf: ['sales.read', 'sales.create'],
    order: 9,
  },
]

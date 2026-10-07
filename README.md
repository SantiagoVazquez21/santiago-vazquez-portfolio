# PortafolioEscritorio

## Requisitos

- **Node 24** (LTS). La versión está fijada en `.nvmrc`.
- **npm** como gestor de paquetes. No uses pnpm ni yarn: el proyecto solo tiene `package-lock.json`.

## Instalar

```bash
npm install
```

Después de `npm install` no hace falta ningún paso manual: ni variables de entorno, ni archivos que crear, ni configuración extra. Todos los comandos de abajo funcionan directamente.

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre en el navegador la URL local que indica la consola.

## Build de producción en local

```bash
npm run build
npm run start
```

`npm run build` genera el build de producción y `npm run start` lo sirve. Abre en el navegador la URL local que indica la consola.

## Tests

```bash
npm run test
```

Ejecuta los tests de Vitest una sola vez (sin modo vigilancia).

## Comandos de calidad

| Comando                  | Qué comprueba               |
| ------------------------ | --------------------------- |
| `npx tsc --noEmit`       | Tipos de TypeScript         |
| `npm run lint`           | Reglas de ESLint            |
| `npx prettier --check .` | Formato con Prettier        |
| `npm run test`           | Tests de Vitest             |
| `npm run build`          | Build de producción de Next |

Todos deben terminar con código de salida 0. En un entorno limpio, la secuencia completa es:

```bash
npm install
npx tsc --noEmit
npm run lint
npx prettier --check .
npm run test
npm run build
```
